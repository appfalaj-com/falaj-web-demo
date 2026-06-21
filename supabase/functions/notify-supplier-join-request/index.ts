import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupplierJoinRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  area: string;
  service_type: string;
  notes: string | null;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { request_id } = await req.json();

    if (!request_id) {
      return jsonResponse({ ok: false, error: "request_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Supabase server secrets are not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: joinRequest, error: requestError } = await supabase
      .from("supplier_join_requests")
      .select("id, company_name, contact_name, phone, email, area, service_type, notes, created_at")
      .eq("id", request_id)
      .single();

    if (requestError || !joinRequest) {
      return jsonResponse(
        { ok: false, error: requestError?.message ?? "Supplier join request was not found" },
        404,
      );
    }

    const supplierJoinRequest = joinRequest as SupplierJoinRequest;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notifyEmail = Deno.env.get("FALAJ_NOTIFY_EMAIL") ?? "info@appfalaj.com";

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not configured; supplier join email notification skipped.");
      return jsonResponse({ ok: true, email_sent: false, reason: "RESEND_API_KEY is not configured" });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("FALAJ_EMAIL_FROM") ?? "Falaj <onboarding@resend.dev>",
        to: [notifyEmail],
        subject: "طلب انضمام مورد جديد - فلج",
        text: buildEmailText(supplierJoinRequest),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.warn("Supplier join email notification failed:", errorText);
      return jsonResponse({ ok: true, email_sent: false, reason: "Email provider request failed" });
    }

    return jsonResponse({ ok: true, email_sent: true });
  } catch (error) {
    console.error("notify-supplier-join-request error:", error);
    return jsonResponse({ ok: false, error: "Unexpected function error" }, 500);
  }
});

function buildEmailText(joinRequest: SupplierJoinRequest) {
  return [
    "طلب انضمام مورد جديد - فلج",
    "",
    `اسم الشركة: ${joinRequest.company_name}`,
    `اسم المسؤول: ${joinRequest.contact_name}`,
    `الهاتف: ${joinRequest.phone}`,
    `البريد: ${joinRequest.email}`,
    `الولاية / المنطقة: ${joinRequest.area}`,
    `نوع الخدمة: ${joinRequest.service_type}`,
    `الملاحظات: ${joinRequest.notes || "لا يوجد"}`,
    `تاريخ الطلب: ${new Date(joinRequest.created_at).toLocaleString("ar-OM", { timeZone: "Asia/Muscat" })}`,
  ].join("\n");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
