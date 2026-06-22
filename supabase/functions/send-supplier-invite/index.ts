import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupplierJoinRequest = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  status: string;
};

type Company = {
  id: string;
  supplier_join_request_id: string | null;
  approved_join_request_id: string | null;
  onboarding_status: string | null;
};

type AuthUser = {
  id: string;
  email?: string;
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
      .select("id, company_name, contact_name, email, status")
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

    const existingUser = await findUserByEmail(supabase, supplierJoinRequest.email);

    if (!existingUser) {
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
        if (isExistingUserError(inviteError.message)) {
          const user = await findUserByEmail(supabase, supplierJoinRequest.email);
          if (!user) {
            return jsonResponse({ ok: false, error: inviteError.message }, 500);
          }

          const result = await linkExistingUserAndSendMagicLink(
            supabase,
            user,
            supplierJoinRequest,
            company.id,
            request_id,
          );

          if (result.error) return result.error;
          return jsonResponse({
            ok: true,
            invitation_sent: true,
            existing_user: true,
            message: "البريد موجود مسبقًا، تم ربطه بالمورد وإرسال رابط دخول آمن.",
          });
        }

        return jsonResponse({ ok: false, error: inviteError.message }, 500);
      }

      const stateError = await markInvitationSent(supabase, request_id, company.id);
      if (stateError) return stateError;

      return jsonResponse({
        ok: true,
        invitation_sent: true,
        existing_user: false,
        message: "تم إرسال دعوة الدخول إلى بريد المورد.",
      });
    }

    const result = await linkExistingUserAndSendMagicLink(
      supabase,
      existingUser,
      supplierJoinRequest,
      company.id,
      request_id,
    );

    if (result.error) return result.error;

    return jsonResponse({
      ok: true,
      invitation_sent: true,
      existing_user: true,
      message: "البريد موجود مسبقًا، تم ربطه بالمورد وإرسال رابط دخول آمن.",
    });
  } catch (error) {
    console.error("send-supplier-invite error:", error);
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected function error" },
      500,
    );
  }
});

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

async function linkExistingUserAndSendMagicLink(
  supabase: ReturnType<typeof createClient>,
  user: AuthUser,
  request: SupplierJoinRequest,
  companyId: string,
  requestId: string,
): Promise<{ error: Response | null }> {
  const email = request.email;
  if (!email) {
    return { error: jsonResponse({ ok: false, error: "Supplier join request does not have an email" }, 400) };
  }

  const fullName = request.contact_name || request.company_name || email || "Supplier User";
  const metadata = {
    role: "company",
    account_type: "company",
    company_id: companyId,
  };

  const { error: userError } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: metadata,
  });

  if (userError) {
    return { error: jsonResponse({ ok: false, error: userError.message }, 500) };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName,
      role: "company",
      account_type: "company",
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: jsonResponse({ ok: false, error: profileError.message }, 500) };
  }

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      owner_id: user.id,
      onboarding_status: "invitation_sent",
      is_active: false,
    })
    .eq("id", companyId);

  if (companyError) {
    return { error: jsonResponse({ ok: false, error: companyError.message }, 500) };
  }

  const { error: magicLinkError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://appfalaj.com/company",
      shouldCreateUser: false,
    },
  });

  if (magicLinkError) {
    return { error: jsonResponse({ ok: false, error: magicLinkError.message }, 500) };
  }

  const stateError = await markInvitationSent(supabase, requestId, companyId);
  if (stateError) return { error: stateError };

  return { error: null };
}

async function markInvitationSent(
  supabase: ReturnType<typeof createClient>,
  requestId: string,
  companyId: string,
): Promise<Response | null> {
  const { error: requestUpdateError } = await supabase
    .from("supplier_join_requests")
    .update({ status: "invitation_sent" })
    .eq("id", requestId);

  if (requestUpdateError) {
    return jsonResponse({ ok: false, error: requestUpdateError.message }, 500);
  }

  const { error: companyUpdateError } = await supabase
    .from("companies")
    .update({ onboarding_status: "invitation_sent" })
    .eq("id", companyId);

  if (companyUpdateError) {
    return jsonResponse({ ok: false, error: companyUpdateError.message }, 500);
  }

  return null;
}

function isExistingUserError(message: string) {
  return message.toLowerCase().includes("already been registered") ||
    message.toLowerCase().includes("already registered") ||
    message.toLowerCase().includes("already exists");
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
