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
      .select("id, owner_id")
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
    const existingUser = await findUserByEmail(supabase, email);

    if (!existingUser) {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: "driver",
          account_type: "driver",
          driver_id: driver.id,
          company_id: driver.company_id,
        },
        redirectTo: "https://appfalaj.com/driver",
      });

      if (inviteError) {
        if (!isExistingUserError(inviteError.message)) {
          return jsonResponse({ ok: false, error: inviteError.message }, 500);
        }

        const user = await findUserByEmail(supabase, email);
        if (!user) {
          return jsonResponse({ ok: false, error: inviteError.message }, 500);
        }

        const linkResult = await linkDriverUser(supabase, user, driver, caller.id);
        if (linkResult.error) return linkResult.error;

        const magicResult = await sendDriverMagicLink(supabase, email);
        if (magicResult) return magicResult;

        return jsonResponse({
          ok: true,
          existing_user: true,
          message: "البريد موجود مسبقًا، تم ربطه بالسائق وإرسال رابط دخول آمن.",
        });
      }

      const invitedUser = inviteData?.user
        ? { id: inviteData.user.id, email: inviteData.user.email ?? email }
        : await findUserByEmail(supabase, email);

      if (!invitedUser) {
        return jsonResponse({ ok: false, error: "Invite was sent, but the user could not be linked" }, 500);
      }

      const linkResult = await linkDriverUser(supabase, invitedUser, driver, caller.id);
      if (linkResult.error) return linkResult.error;

      return jsonResponse({
        ok: true,
        existing_user: false,
        message: "تم إرسال دعوة دخول السائق وربطه بالشركة.",
      });
    }

    const linkResult = await linkDriverUser(supabase, existingUser, driver, caller.id);
    if (linkResult.error) return linkResult.error;

    const magicResult = await sendDriverMagicLink(supabase, email);
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

async function sendDriverMagicLink(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<Response | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "https://appfalaj.com/driver",
      shouldCreateUser: false,
    },
  });

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500);
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
