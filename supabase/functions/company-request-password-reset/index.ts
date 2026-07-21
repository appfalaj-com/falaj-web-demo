import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPANY_ACCEPT_RESET_URL = "https://www.appfalaj.com/company/accept-reset";
const COMPANY_RESET_TICKET_TTL_MINUTES = 30;

type AuthUser = {
  id: string;
  email?: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    let payload: { email?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Request body must be valid JSON" }, 400);
    }

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return jsonResponse({ ok: false, error: "Email is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Reset service is not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const user = await findUserByEmail(supabase, email);
    if (!user) {
      return jsonResponse({ ok: true });
    }

    const profile = await findProfileByUserOrEmail(supabase, user.id, email);
    if (!isCompanyProfile(profile)) {
      return jsonResponse({ ok: true });
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, owner_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (companyError) {
      return jsonResponse({ ok: false, error: "Company account could not be verified" }, 500);
    }

    if (!company) {
      return jsonResponse({ ok: true });
    }

    const acceptLink = await createCompanyResetLink(user.id, email, serviceRoleKey);
    const emailResult = await sendCompanyResetEmail(email, acceptLink);
    if (emailResult) return emailResult;

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("company-request-password-reset error:", error);
    return jsonResponse({ ok: false, error: "Unexpected reset request error" }, 500);
  }
});

async function createCompanyResetLink(userId: string, email: string, signingSecret: string) {
  const payload = {
    user_id: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + COMPANY_RESET_TICKET_TTL_MINUTES * 60,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload, signingSecret);
  const token = `${encodedPayload}.${signature}`;
  return `${COMPANY_ACCEPT_RESET_URL}?ticket=${encodeURIComponent(token)}`;
}

async function sendCompanyResetEmail(email: string, acceptLink: string): Promise<Response | null> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ ok: false, error: "Email provider is not configured" }, 500);
  }

  const from = Deno.env.get("FALAJ_EMAIL_FROM") ?? "Falaj <onboarding@resend.dev>";
  const subject = "إعادة تعيين كلمة مرور المورد في فلج";
  const text = [
    "إعادة تعيين كلمة مرور المورد في فلج",
    "",
    "افتح رابط فلج التالي، ثم اضغط زر بدء إعادة تعيين كلمة المرور.",
    "لن يتم إنشاء رابط Supabase الآمن إلا بعد ضغط الزر داخل صفحة فلج.",
    acceptLink,
    "",
    "Falaj supplier password reset",
    "Open the Falaj link above, then press the button to start password reset.",
  ].join("\n");
  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#123;">
      <h2>إعادة تعيين كلمة مرور المورد في فلج</h2>
      <p>افتح رابط فلج التالي، ثم اضغط زر بدء إعادة تعيين كلمة المرور.</p>
      <p>لن يتم إنشاء رابط Supabase الآمن إلا بعد ضغط الزر داخل صفحة فلج.</p>
      <p>
        <a href="${escapeHtml(acceptLink)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;">
          فتح صفحة إعادة التعيين
        </a>
      </p>
      <p style="direction:ltr;text-align:left;margin-top:28px;">
        <strong>Falaj supplier password reset</strong><br>
        Open the Falaj link above, then press the button to start password reset.
      </p>
    </div>
  `;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      text,
      html,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.warn("Company reset email failed:", errorText);
    return jsonResponse({ ok: false, error: "Password reset email could not be sent" }, 500);
  }

  return null;
}

async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 100;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const user = users.find((item) => item.email?.trim().toLowerCase() === normalizedEmail);
    if (user) return { id: user.id, email: user.email };
    if (users.length < perPage) return null;
  }

  return null;
}

async function findProfileByUserOrEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string,
): Promise<ProfileRow | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, account_type")
    .or(`id.eq.${userId},email.eq.${normalizedEmail}`)
    .limit(1);

  if (error) throw error;
  return (data?.[0] as ProfileRow | undefined) ?? null;
}

function isCompanyProfile(profile: ProfileRow | null) {
  if (!profile) return false;
  return profile.role === "company" && profile.account_type === "company";
}

async function signPayload(encodedPayload: string, signingSecret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
