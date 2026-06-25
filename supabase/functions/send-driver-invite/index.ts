import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DriverRow = {
  id: string;
  company_id: string;
  profile_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
};

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

const DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR =
  "هذا البريد مستخدم كحساب شركة. أدخل بريدًا مختلفًا للسائق.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: { driver_id?: string };

    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Request body must be valid JSON" }, 400);
    }

    const driverId = payload.driver_id;
    if (!driverId) {
      return jsonResponse({ ok: false, error: "driver_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Supabase server secrets are not configured" }, 500);
    }

    const authorization = req.headers.get("Authorization") ?? "";
    const jwt = authorization.replace("Bearer ", "").trim();
    if (!jwt) {
      return jsonResponse({ ok: false, error: "Missing authenticated user token" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt);
    if (callerError || !callerData?.user) {
      return jsonResponse({ ok: false, error: callerError?.message ?? "Invalid authenticated user token" }, 401);
    }

    const caller = callerData.user;

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("id, company_id, profile_id, name, phone, email, is_active")
      .eq("id", driverId)
      .single();

    if (driverError || !driverData) {
      return jsonResponse({ ok: false, error: driverError?.message ?? "Driver was not found" }, 404);
    }

    const driver = driverData as DriverRow;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, owner_id, email, phone")
      .eq("id", driver.company_id)
      .maybeSingle();

    if (companyError || !company) {
      return jsonResponse({ ok: false, error: companyError?.message ?? "Driver company was not found" }, 404);
    }

    if (company.owner_id !== caller.id) {
      return jsonResponse({ ok: false, error: "You are not allowed to invite drivers for this company" }, 403);
    }

    if (!driver.email) {
      return jsonResponse({ ok: false, error: "Driver email is required before sending an invite" }, 400);
    }

    const email = driver.email.trim().toLowerCase();
    const callerEmail = caller.email?.trim().toLowerCase();
    const companyEmail = company.email?.trim().toLowerCase();

    if ((callerEmail && email === callerEmail) || (companyEmail && email === companyEmail)) {
      return jsonResponse({ ok: false, error: DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR }, 400);
    }

    const existingUser = await findUserByEmail(supabase, email);
    const existingProfile = existingUser
      ? await findProfileByUserOrEmail(supabase, existingUser.id, email)
      : await findProfileByUserOrEmail(supabase, null, email);

    if (
      existingUser?.id === company.owner_id ||
      existingProfile?.id === company.owner_id ||
      isCompanyOrAdminProfile(existingProfile)
    ) {
      return jsonResponse({ ok: false, error: DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR }, 400);
    }

    if (!existingUser) {
      const inviteLinkResult = await generateDriverInviteLink(supabase, email, driver);

      if (inviteLinkResult.error) {
        if (!isExistingUserError(inviteLinkResult.message)) {
          return jsonResponse({ ok: false, error: inviteLinkResult.message }, 500);
        }

        const user = await findUserByEmail(supabase, email);
        if (!user) {
          return jsonResponse({ ok: false, error: inviteLinkResult.message }, 500);
        }

        const linkResult = await linkDriverUser(supabase, user, driver, caller.id);
        if (linkResult.error) return linkResult.error;

        const magicLinkResult = await generateDriverMagicLink(supabase, email);
        if (magicLinkResult.error) return jsonResponse({ ok: false, error: magicLinkResult.message }, 500);

        const magicResult = await sendDriverInviteEmail(email, driver, magicLinkResult.actionLink, true);
        if (magicResult) return magicResult;

        return jsonResponse({
          ok: true,
          existing_user: true,
          message: "البريد موجود مسبقًا، تم ربطه بالسائق وإرسال رابط دخول آمن.",
        });
      }

      const invitedUser = inviteLinkResult.user
        ? { id: inviteLinkResult.user.id, email: inviteLinkResult.user.email ?? email }
        : await findUserByEmail(supabase, email);

      if (!invitedUser) {
        return jsonResponse({ ok: false, error: "Invite was sent, but the user could not be linked" }, 500);
      }

      const linkResult = await linkDriverUser(supabase, invitedUser, driver, caller.id);
      if (linkResult.error) return linkResult.error;

      const emailResult = await sendDriverInviteEmail(email, driver, inviteLinkResult.actionLink, false);
      if (emailResult) return emailResult;

      return jsonResponse({
        ok: true,
        existing_user: false,
        message: "تم إرسال دعوة دخول السائق وربطه بالشركة.",
      });
    }

    const linkResult = await linkDriverUser(supabase, existingUser, driver, caller.id);
    if (linkResult.error) return linkResult.error;

    const magicLinkResult = await generateDriverMagicLink(supabase, email);
    if (magicLinkResult.error) return jsonResponse({ ok: false, error: magicLinkResult.message }, 500);

    const magicResult = await sendDriverInviteEmail(email, driver, magicLinkResult.actionLink, true);
    if (magicResult) return magicResult;

    return jsonResponse({
      ok: true,
      existing_user: true,
      message: "البريد موجود مسبقًا، تم ربطه بالسائق وإرسال رابط دخول آمن.",
    });
  } catch (error) {
    console.error("send-driver-invite error:", error);
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected function error" },
      500,
    );
  }
});

async function linkDriverUser(
  supabase: ReturnType<typeof createClient>,
  user: AuthUser,
  driver: DriverRow,
  invitedBy: string,
): Promise<{ error: Response | null }> {
  const email = driver.email?.trim().toLowerCase();
  if (!email) {
    return { error: jsonResponse({ ok: false, error: "Driver email is required" }, 400) };
  }

  const existingProfile = await findProfileByUserOrEmail(supabase, user.id, email);
  if (isCompanyOrAdminProfile(existingProfile)) {
    return { error: jsonResponse({ ok: false, error: DRIVER_COMPANY_ACCOUNT_CONFLICT_ERROR }, 400) };
  }

  const metadata = {
    role: "driver",
    account_type: "driver",
    driver_id: driver.id,
    company_id: driver.company_id,
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
      full_name: driver.name || email || "Falaj Driver",
      phone: driver.phone,
      role: "driver",
      account_type: "driver",
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: jsonResponse({ ok: false, error: profileError.message }, 500) };
  }

  const { error: driverError } = await supabase
    .from("drivers")
    .update({
      profile_id: user.id,
      email,
      invite_status: "sent",
      invited_at: new Date().toISOString(),
      invited_by: invitedBy,
    })
    .eq("id", driver.id)
    .eq("company_id", driver.company_id);

  if (driverError) {
    return { error: jsonResponse({ ok: false, error: driverError.message }, 500) };
  }

  return verifyDriverLink(supabase, user.id, driver.id);
}

async function verifyDriverLink(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  driverId: string,
): Promise<{ error: Response | null }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { error: jsonResponse({ ok: false, error: profileError.message }, 500) };
  }

  if (!profile || profile.role !== "driver" || profile.account_type !== "driver") {
    return { error: jsonResponse({ ok: false, error: "Driver profile was not linked correctly" }, 500) };
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("id, profile_id")
    .eq("id", driverId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (driverError) {
    return { error: jsonResponse({ ok: false, error: driverError.message }, 500) };
  }

  if (!driver) {
    return { error: jsonResponse({ ok: false, error: "Driver row was not linked correctly" }, 500) };
  }

  return { error: null };
}

async function generateDriverInviteLink(
  supabase: ReturnType<typeof createClient>,
  email: string,
  driver: DriverRow,
): Promise<{ actionLink: string; user: AuthUser | null; error: boolean; message: string }> {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: {
        role: "driver",
        account_type: "driver",
        driver_id: driver.id,
        company_id: driver.company_id,
      },
      redirectTo: "https://appfalaj.com/driver",
    },
  });

  if (error) {
    return { actionLink: "", user: null, error: true, message: error.message };
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    return { actionLink: "", user: null, error: true, message: "Driver invite link could not be generated" };
  }

  const user = data?.user ? { id: data.user.id, email: data.user.email ?? email } : null;
  return { actionLink, user, error: false, message: "" };
}

async function generateDriverMagicLink(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<{ actionLink: string; error: boolean; message: string }> {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: "https://appfalaj.com/driver",
    },
  });

  if (error) {
    return { actionLink: "", error: true, message: error.message };
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    return { actionLink: "", error: true, message: "Driver login link could not be generated" };
  }

  return { actionLink, error: false, message: "" };
}

async function sendDriverInviteEmail(
  email: string,
  driver: DriverRow,
  actionLink: string,
  existingUser: boolean,
): Promise<Response | null> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return jsonResponse({ ok: false, error: "Driver email provider is not configured" }, 500);
  }

  const from = Deno.env.get("FALAJ_EMAIL_FROM") ?? "Falaj <onboarding@resend.dev>";
  const driverName = driver.name?.trim() || "Falaj Driver";
  const subject = existingUser ? "رابط دخول السائق إلى فلج" : "دعوة للانضمام كسائق في فلج";
  const text = buildDriverInviteText(driverName, actionLink, existingUser);
  const html = buildDriverInviteHtml(driverName, actionLink, existingUser);

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
    console.warn("Driver invite email failed:", errorText);
    return jsonResponse({ ok: false, error: "Driver invite email could not be sent" }, 500);
  }

  return null;
}

function buildDriverInviteText(driverName: string, actionLink: string, existingUser: boolean) {
  const title = existingUser ? "رابط دخول السائق إلى فلج" : "دعوة للانضمام كسائق في فلج";
  const englishTitle = existingUser ? "Falaj Driver Login Link" : "Invitation to Join Falaj as a Driver";

  return [
    title,
    "",
    `مرحبًا ${driverName},`,
    "تمت دعوتك لاستخدام بوابة السائق في فلج لإدارة طلبات التوصيل المسندة إليك.",
    existingUser
      ? "افتح الرابط التالي للدخول إلى صفحة السائق."
      : "افتح الرابط التالي لقبول الدعوة وتفعيل حساب السائق.",
    actionLink,
    "",
    englishTitle,
    `Hello ${driverName},`,
    "You have been invited to use the Falaj driver portal for assigned deliveries.",
    existingUser ? "Open the link above to sign in." : "Open the link above to accept the driver invitation.",
  ].join("\n");
}

function buildDriverInviteHtml(driverName: string, actionLink: string, existingUser: boolean) {
  const title = existingUser ? "رابط دخول السائق إلى فلج" : "دعوة للانضمام كسائق في فلج";
  const englishTitle = existingUser ? "Falaj Driver Login Link" : "Invitation to Join Falaj as a Driver";
  const cta = existingUser ? "دخول بوابة السائق" : "قبول دعوة السائق";

  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#123;">
      <h2>${escapeHtml(title)}</h2>
      <p>مرحبًا ${escapeHtml(driverName)},</p>
      <p>تمت دعوتك لاستخدام بوابة السائق في فلج لإدارة طلبات التوصيل المسندة إليك.</p>
      <p>
        <a href="${escapeHtml(actionLink)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;">
          ${escapeHtml(cta)}
        </a>
      </p>
      <p style="direction:ltr;text-align:left;margin-top:28px;">
        <strong>${escapeHtml(englishTitle)}</strong><br>
        You have been invited to use the Falaj driver portal for assigned deliveries.
      </p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
): Promise<ProfileRow | null> {
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

  return (data?.[0] as ProfileRow | undefined) ?? null;
}

function isCompanyOrAdminProfile(profile: ProfileRow | null) {
  if (!profile) return false;
  const role = `${profile.role ?? ""}`.trim().toLowerCase();
  const accountType = `${profile.account_type ?? ""}`.trim().toLowerCase();
  return role === "company" || role === "admin" || accountType === "company" || accountType === "admin";
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
