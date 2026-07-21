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
  owner_id?: string | null;
  supplier_join_request_id: string | null;
  approved_join_request_id: string | null;
  onboarding_status: string | null;
};

type AuthUser = {
  id: string;
  email?: string;
};

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  account_type: string | null;
};

const ACCOUNT_EMAIL_ALREADY_USED_ERROR =
  "هذا البريد مستخدم مسبقًا في فلج. استخدم بريدًا مختلفًا.";

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

    const adminCheck = await requireAdminCaller(supabase, req);
    if (adminCheck.error) return adminCheck.error;

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
    const allowedStatuses = ["company_created", "invitation_pending", "invitation_sent"];

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
      .select("id, owner_id, supplier_join_request_id, approved_join_request_id, onboarding_status")
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
    const existingProfile = existingUser
      ? await findProfileByUserOrEmail(supabase, existingUser.id, supplierJoinRequest.email)
      : await findProfileByUserOrEmail(supabase, null, supplierJoinRequest.email);

    if (isEmailAlreadyUsedForAnotherSupplierAccount(existingUser, existingProfile, company)) {
      return jsonResponse({ ok: false, error: ACCOUNT_EMAIL_ALREADY_USED_ERROR }, 400);
    }

    if (!existingUser) {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        supplierJoinRequest.email,
        {
          data: {
            role: "company",
            account_type: "company",
            company_id: company.id,
          },
          redirectTo: "https://www.appfalaj.com/company/set-password",
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

      const invitedUser = inviteData?.user
        ? { id: inviteData.user.id, email: inviteData.user.email ?? supplierJoinRequest.email }
        : await findUserByEmail(supabase, supplierJoinRequest.email);

      if (!invitedUser) {
        return jsonResponse(
          { ok: false, error: "Invite was sent, but the invited user could not be found for profile linking" },
          500,
        );
      }

      const linkResult = await ensureSupplierAccountLink(
        supabase,
        invitedUser,
        supplierJoinRequest,
        company.id,
      );
      if (linkResult.error) return linkResult.error;

      const stateError = await markInvitationSent(supabase, request_id, company.id);
      if (stateError) return stateError;

      const verifyResult = await verifySupplierAccountLink(supabase, invitedUser.id, company.id);
      if (verifyResult.error) return verifyResult.error;

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

async function requireAdminCaller(
  supabase: ReturnType<typeof createClient>,
  req: Request,
): Promise<{ error: Response | null }> {
  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace("Bearer ", "").trim();

  if (!jwt) {
    return { error: jsonResponse({ ok: false, error: "Missing authenticated user token" }, 401) };
  }

  const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt);
  const caller = callerData?.user;

  if (callerError || !caller) {
    return {
      error: jsonResponse({ ok: false, error: "Invalid authenticated user token" }, 401),
    };
  }

  const lookupFilter = [
    caller.id ? `id.eq.${caller.id}` : null,
    caller.email ? `email.eq.${caller.email}` : null,
  ]
    .filter(Boolean)
    .join(",");

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role, account_type")
    .or(lookupFilter)
    .limit(1);

  if (profileError) {
    return { error: jsonResponse({ ok: false, error: "Could not verify caller permissions" }, 500) };
  }

  const profile = (profiles?.[0] ?? null) as Profile | null;
  const role = profile?.role?.trim().toLowerCase();
  const accountType = profile?.account_type?.trim().toLowerCase();

  if (role !== "admin" && accountType !== "admin") {
    return { error: jsonResponse({ ok: false, error: "Admin access is required" }, 403) };
  }

  return { error: null };
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
  userId: string | null,
  email: string,
): Promise<Profile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let query = supabase
    .from("profiles")
    .select("id, email, role, account_type")
    .limit(1);

  if (userId) {
    query = query.or(`id.eq.${userId},email.eq.${normalizedEmail}`);
  } else {
    query = query.eq("email", normalizedEmail);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data?.[0] as Profile | undefined) ?? null;
}

async function ensureSupplierAccountLink(
  supabase: ReturnType<typeof createClient>,
  user: AuthUser,
  request: SupplierJoinRequest,
  companyId: string,
): Promise<{ error: Response | null }> {
  const email = request.email;
  if (!email) {
    return { error: jsonResponse({ ok: false, error: "Supplier join request does not have an email" }, 400) };
  }

  const fullName = request.contact_name || request.company_name || email || "Supplier User";
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, owner_id, supplier_join_request_id, approved_join_request_id, onboarding_status")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return { error: jsonResponse({ ok: false, error: companyError.message }, 500) };
  }

  const existingProfile = await findProfileByUserOrEmail(supabase, user.id, email);
  if (existingProfile && isEmailAlreadyUsedForAnotherSupplierAccount(user, existingProfile, company as Company | null)) {
    return { error: jsonResponse({ ok: false, error: ACCOUNT_EMAIL_ALREADY_USED_ERROR }, 400) };
  }

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

  return { error: null };
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

  const linkResult = await ensureSupplierAccountLink(supabase, user, request, companyId);
  if (linkResult.error) return linkResult;

  const { error: magicLinkError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://www.appfalaj.com/company/set-password",
      shouldCreateUser: false,
    },
  });

  if (magicLinkError) {
    return { error: jsonResponse({ ok: false, error: magicLinkError.message }, 500) };
  }

  const stateError = await markInvitationSent(supabase, requestId, companyId);
  if (stateError) return { error: stateError };

  return verifySupplierAccountLink(supabase, user.id, companyId);
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

async function verifySupplierAccountLink(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  companyId: string,
): Promise<{ error: Response | null }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { error: jsonResponse({ ok: false, error: profileError.message }, 500) };
  }

  if (!profile || !isCompanyProfile(profile)) {
    return {
      error: jsonResponse(
        { ok: false, error: "Supplier profile was not linked correctly after sending the invite" },
        500,
      ),
    };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, owner_id, onboarding_status")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (companyError) {
    return { error: jsonResponse({ ok: false, error: companyError.message }, 500) };
  }

  if (!company || company.onboarding_status !== "invitation_sent") {
    return {
      error: jsonResponse(
        { ok: false, error: "Supplier company was not linked correctly after sending the invite" },
        500,
      ),
    };
  }

  return { error: null };
}

function isExistingUserError(message: string) {
  return message.toLowerCase().includes("already been registered") ||
    message.toLowerCase().includes("already registered") ||
    message.toLowerCase().includes("already exists");
}

function isCompanyProfile(profile: Pick<Profile, "role" | "account_type"> | null) {
  if (!profile) return false;
  const role = profile.role?.trim().toLowerCase();
  const accountType = profile.account_type?.trim().toLowerCase();
  return role === "company" || accountType === "company";
}

function isEmailAlreadyUsedForAnotherSupplierAccount(
  user: AuthUser | null,
  profile: Profile | null,
  company: Company | null,
) {
  const isSameLinkedSupplier =
    Boolean(user?.id) &&
    Boolean(company?.owner_id) &&
    user?.id === company?.owner_id &&
    profile?.id === company?.owner_id &&
    isCompanyProfile(profile);

  if (isSameLinkedSupplier) return false;
  return Boolean(user || profile);
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
