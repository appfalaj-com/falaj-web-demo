import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_ERROR = "بيانات تسجيل الدخول غير صحيحة.";
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

type PhoneLoginPayload = {
  phone?: string;
  password?: string;
};

type ResolverRow = {
  login_status: string;
  email: string | null;
  profile_id: string | null;
  driver_id: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 500);
    }

    let payload: PhoneLoginPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || "");
    if (phone.length < 6 || password.length < 1) {
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rateKey = await buildRateKey(req, phone);
    const rateLimit = await checkRateLimit(supabaseAdmin, rateKey);
    if (!rateLimit.allowed) {
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 429);
    }

    const resolver = await resolveDriverByPhone(supabaseAdmin, phone);
    if (resolver.login_status !== "ok" || !resolver.email || !resolver.profile_id || !resolver.driver_id) {
      await recordFailedAttempt(supabaseAdmin, rateKey, rateLimit);
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: resolver.email,
        password,
      }),
    });

    if (!tokenResponse.ok) {
      await recordFailedAttempt(supabaseAdmin, rateKey, rateLimit);
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const session = await tokenResponse.json();
    const accessToken = session?.access_token;
    if (!accessToken) {
      await recordFailedAttempt(supabaseAdmin, rateKey, rateLimit);
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authUserError || authUser?.user?.id !== resolver.profile_id) {
      await recordFailedAttempt(supabaseAdmin, rateKey, rateLimit);
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    const { data: driver, error: driverError } = await supabaseAdmin
      .from("drivers")
      .select("id, profile_id, is_active, invite_status")
      .eq("id", resolver.driver_id)
      .eq("profile_id", resolver.profile_id)
      .maybeSingle();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, account_type")
      .eq("id", resolver.profile_id)
      .maybeSingle();

    const isDriver =
      String(profile?.role || "").toLowerCase() === "driver" &&
      String(profile?.account_type || "").toLowerCase() === "driver";

    if (
      driverError ||
      profileError ||
      !driver ||
      driver.is_active !== true ||
      driver.invite_status !== "accepted" ||
      !isDriver
    ) {
      await recordFailedAttempt(supabaseAdmin, rateKey, rateLimit);
      return jsonResponse({ ok: false, error: GENERIC_ERROR }, 400);
    }

    await clearRateLimit(supabaseAdmin, rateKey);
    return jsonResponse({ ok: true, session });
  } catch (error) {
    console.error("driver-phone-login failed", {
      message: error instanceof Error ? error.message : "Unexpected error",
    });
    return jsonResponse({ ok: false, error: GENERIC_ERROR }, 500);
  }
});

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^0-9]/g, "");
}

async function buildRateKey(req: Request, phone: string) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const encoded = new TextEncoder().encode(`${ip}|${phone}`);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function checkRateLimit(supabaseAdmin: ReturnType<typeof createClient>, rateKey: string) {
  const now = new Date();
  const { data, error } = await supabaseAdmin
    .from("driver_login_rate_limits")
    .select("rate_key, attempts, window_start, blocked_until")
    .eq("rate_key", rateKey)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { allowed: true, attempts: 0, windowStart: now };
  }

  const blockedUntil = data.blocked_until ? new Date(data.blocked_until) : null;
  if (blockedUntil && blockedUntil > now) {
    return { allowed: false, attempts: data.attempts || 0, windowStart: new Date(data.window_start || now) };
  }

  const windowStart = data.window_start ? new Date(data.window_start) : now;
  if (now.getTime() - windowStart.getTime() > WINDOW_MS) {
    await supabaseAdmin.from("driver_login_rate_limits").upsert({
      rate_key: rateKey,
      attempts: 0,
      window_start: now.toISOString(),
      blocked_until: null,
      updated_at: now.toISOString(),
    });
    return { allowed: true, attempts: 0, windowStart: now };
  }

  if ((data.attempts || 0) >= MAX_ATTEMPTS) {
    return { allowed: false, attempts: data.attempts || 0, windowStart };
  }

  return { allowed: true, attempts: data.attempts || 0, windowStart };
}

async function recordFailedAttempt(
  supabaseAdmin: ReturnType<typeof createClient>,
  rateKey: string,
  rateLimit: { attempts: number; windowStart: Date },
) {
  const now = new Date();
  const attempts = rateLimit.attempts + 1;
  const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS).toISOString() : null;

  await supabaseAdmin.from("driver_login_rate_limits").upsert({
    rate_key: rateKey,
    attempts,
    window_start: rateLimit.windowStart.toISOString(),
    blocked_until: blockedUntil,
    updated_at: now.toISOString(),
  });
}

async function clearRateLimit(supabaseAdmin: ReturnType<typeof createClient>, rateKey: string) {
  await supabaseAdmin.from("driver_login_rate_limits").delete().eq("rate_key", rateKey);
}

async function resolveDriverByPhone(
  supabaseAdmin: ReturnType<typeof createClient>,
  phone: string,
): Promise<ResolverRow> {
  const { data, error } = await supabaseAdmin.rpc("resolve_driver_phone_login_private", {
    p_identifier: phone,
  });

  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  return {
    login_status: result?.login_status || "invalid",
    email: result?.email || null,
    profile_id: result?.profile_id || null,
    driver_id: result?.driver_id || null,
  };
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
