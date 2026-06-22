import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupplierJoinRequest = {
  id: string;
  email: string | null;
  status: string;
};

type Company = {
  id: string;
  supplier_join_request_id: string | null;
  approved_join_request_id: string | null;
  onboarding_status: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: { request_id?: string };

    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Request body must be valid JSON" }, 400);
    }

    const { request_id } = payload;

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
      .select("id, email, status")
      .eq("id", request_id)
      .single();

    if (requestError || !joinRequest) {
      return jsonResponse(
        { ok: false, error: requestError?.message ?? "Supplier join request was not found" },
        404,
      );
    }

    const supplierJoinRequest = joinRequest as SupplierJoinRequest;
    const normalizedStatus = supplierJoinRequest.status === "new" ? "pending" : supplierJoinRequest.status;
    const allowedStatuses = ["company_created", "invitation_pending"];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return jsonResponse(
        { ok: false, error: `Supplier join request is not ready for an invite. Current status: ${normalizedStatus}` },
        409,
      );
    }

    if (!supplierJoinRequest.email) {
      return jsonResponse({ ok: false, error: "Supplier join request does not have an email" }, 400);
    }

    const { data: companyRows, error: companyError } = await supabase
      .from("companies")
      .select("id, supplier_join_request_id, approved_join_request_id, onboarding_status")
      .or(`supplier_join_request_id.eq.${request_id},approved_join_request_id.eq.${request_id}`)
      .limit(1);

    if (companyError) {
      return jsonResponse({ ok: false, error: companyError.message }, 500);
    }

    const company = (companyRows?.[0] ?? null) as Company | null;

    if (!company) {
      return jsonResponse({ ok: false, error: "No company is linked to this join request" }, 404);
    }

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      supplierJoinRequest.email,
      {
        data: {
          role: "company",
          account_type: "company",
          company_id: company.id,
        },
        redirectTo: "https://appfalaj.com/company",
      },
    );

    if (inviteError) {
      return jsonResponse({ ok: false, error: inviteError.message }, 500);
    }

    const { error: requestUpdateError } = await supabase
      .from("supplier_join_requests")
      .update({ status: "invitation_sent" })
      .eq("id", request_id);

    if (requestUpdateError) {
      return jsonResponse({ ok: false, error: requestUpdateError.message }, 500);
    }

    const { error: companyUpdateError } = await supabase
      .from("companies")
      .update({ onboarding_status: "invitation_sent" })
      .eq("id", company.id);

    if (companyUpdateError) {
      return jsonResponse({ ok: false, error: companyUpdateError.message }, 500);
    }

    return jsonResponse({ ok: true, invitation_sent: true });
  } catch (error) {
    console.error("send-supplier-invite error:", error);
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected function error" },
      500,
    );
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
