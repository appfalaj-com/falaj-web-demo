import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_DRIVER_SET_PASSWORD_URL = "https://www.appfalaj.com/driver/set-password";

type DriverRow = {
  id: string;
  profile_id: string | null;
  email: string | null;
  is_active: boolean | null;
};

type ProfileRow = {
  id: string;
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
    let payload: { ticket?: string; redirect_to?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid invite link." }, 400);
    }

    const signedTicket = String(payload.ticket || "").trim();
    if (!signedTicket || signedTicket.length < 20) {
      return jsonResponse({ ok: false, error: "Invalid invite link." }, 400);
    }
    const redirectTo = sanitizeRedirectTo(payload.redirect_to, "/driver/set-password") ||
      DEFAULT_DRIVER_SET_PASSWORD_URL;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "Invite service is not configured." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const ticket = await verifyDriverInviteTicket(signedTicket, serviceRoleKey);
    if (!ticket.ok) {
      return jsonResponse({ ok: false, error: "Invite link is invalid or expired." }, 400);
    }

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("id, profile_id, email, is_active")
      .eq("id", ticket.driverId)
      .maybeSingle();

    if (driverError) {
      return jsonResponse({ ok: false, error: "Driver account could not be verified." }, 500);
    }

    const driver = driverData as DriverRow | null;
    if (!driver?.is_active || !driver.profile_id || !driver.email) {
      return jsonResponse({ ok: false, error: "Driver account is not active or linked." }, 400);
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, account_type")
      .eq("id", driver.profile_id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse({ ok: false, error: "Driver profile could not be verified." }, 500);
    }

    const profile = profileData as ProfileRow | null;
    if (!profile || profile.role !== "driver" || profile.account_type !== "driver") {
      return jsonResponse({ ok: false, error: "Driver account is not valid." }, 400);
    }

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: driver.email.trim().toLowerCase(),
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      return jsonResponse({ ok: false, error: "Password setup link could not be generated." }, 500);
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return jsonResponse({ ok: false, error: "Password setup link could not be generated." }, 500);
    }

    return jsonResponse({ ok: true, redirect_to: actionLink });
  } catch (error) {
    console.error("driver-accept-invite error:", error);
    return jsonResponse({ ok: false, error: "Unexpected invite error." }, 500);
  }
});

async function verifyDriverInviteTicket(
  token: string,
  signingSecret: string,
): Promise<{ ok: true; driverId: string } | { ok: false }> {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false };

  const [encodedPayload, providedSignature] = parts;
  const expectedSignature = await signInvitePayload(encodedPayload, signingSecret);
  if (!timingSafeEqual(providedSignature, expectedSignature)) return { ok: false };

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { driver_id?: string; exp?: number };
    if (!payload.driver_id || !payload.exp) return { ok: false };
    if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };
    return { ok: true, driverId: payload.driver_id };
  } catch {
    return { ok: false };
  }
}

async function signInvitePayload(encodedPayload: string, signingSecret: string) {
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

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function sanitizeRedirectTo(value: string | undefined, expectedPath: string) {
  if (!value) return "";

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === "appfalaj.com" || hostname === "www.appfalaj.com" || hostname === "localhost" || hostname === "127.0.0.1";
    if (!allowedHost || url.pathname !== expectedPath) return "";
    return url.toString();
  } catch {
    return "";
  }
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
