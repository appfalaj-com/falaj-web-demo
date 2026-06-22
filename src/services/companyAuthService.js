import { supabase } from "../lib/supabaseClient.js";

export const COMPANY_AUTH_ERRORS = {
  NOT_CONFIGURED: "لم يتم إعداد اتصال Supabase لهذا التطبيق.",
  NOT_COMPANY: "هذا الحساب غير مصرح له بالدخول إلى لوحة الموردين",
  NOT_ADMIN: "هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة",
  NO_COMPANY: "لا توجد شركة مرتبطة بهذا الحساب. يرجى التواصل مع إدارة فلج.",
  PHONE_DISABLED: "الدخول بالهاتف غير مفعل حاليًا. يرجى استخدام الدخول بالإيميل أو التواصل مع إدارة فلج.",
};

function requireSupabase() {
  if (!supabase) {
    throw new Error(COMPANY_AUTH_ERRORS.NOT_CONFIGURED);
  }

  return supabase;
}

function logAuthDebug(label, payload) {
  if (!import.meta.env.DEV) return;
  console.debug(`[Falaj auth] ${label}`, payload);
}

function isPhoneAuthError(error) {
  const message = `${error?.message ?? ""} ${error?.name ?? ""}`.toLowerCase();
  return (
    message.includes("sms") ||
    message.includes("phone") ||
    message.includes("provider") ||
    message.includes("otp")
  );
}

function userIdentity(userOrId, email) {
  if (typeof userOrId === "string") {
    return { id: userOrId, email };
  }

  return { id: userOrId?.id, email: userOrId?.email ?? email };
}

function profileLookupFilter(identity) {
  return [
    identity.id ? `id.eq.${identity.id}` : null,
    identity.email ? `email.eq.${identity.email}` : null,
  ]
    .filter(Boolean)
    .join(",");
}

export function getProfileRole(profile) {
  return (profile?.role ?? profile?.account_type ?? "").toString().trim().toLowerCase() || null;
}

export async function getCurrentProfile(userOrId, email) {
  const client = requireSupabase();
  const identity = userIdentity(userOrId, email);

  if (!identity.id && !identity.email) {
    logAuthDebug("profile lookup rejected", { reason: "missing user id and email" });
    return null;
  }

  const lookupFilter = profileLookupFilter(identity);
  const withRole = await client
    .from("profiles")
    .select("id, full_name, phone, email, role, account_type")
    .or(lookupFilter)
    .limit(1);

  if (!withRole.error) {
    const profile = withRole.data?.[0] ?? null;
    logAuthDebug("profile lookup", {
      userId: identity.id,
      userEmail: identity.email,
      profile,
      role: getProfileRole(profile),
      foundBy: profile?.id === identity.id ? "id" : profile?.email === identity.email ? "email" : "none",
    });
    return profile;
  }

  const fallback = await client
    .from("profiles")
    .select("id, full_name, phone, email, account_type")
    .or(lookupFilter)
    .limit(1);

  if (fallback.error) {
    logAuthDebug("profile lookup failed", {
      userId: identity.id,
      userEmail: identity.email,
      reason: fallback.error.message,
    });
    throw fallback.error;
  }

  const profile = fallback.data?.[0] ?? null;
  logAuthDebug("profile lookup fallback", {
    userId: identity.id,
    userEmail: identity.email,
    profile,
    role: getProfileRole(profile),
  });

  return profile;
}

const COMPANY_SESSION_COLUMNS =
  "id, name, email, phone, is_active, commission_rate, owner_id, onboarding_status, updated_at";
const ACTIVE_ONBOARDING_STATUSES = new Set([
  "invitation_sent",
  "pending_setup",
  "company_created",
  "activated",
]);

export async function getCompanyForUser(userOrId) {
  const client = requireSupabase();
  const userId = typeof userOrId === "string" ? userOrId : userOrId?.id;
  const metadataCompanyId = typeof userOrId === "string" ? null : userOrId?.user_metadata?.company_id;

  if (metadataCompanyId) {
    const byMetadataCompany = await client
      .from("companies")
      .select(COMPANY_SESSION_COLUMNS)
      .eq("id", metadataCompanyId)
      .maybeSingle();

    if (byMetadataCompany.error) {
      throw byMetadataCompany.error;
    }

    if (byMetadataCompany.data && (!byMetadataCompany.data.owner_id || byMetadataCompany.data.owner_id === userId)) {
      return byMetadataCompany.data;
    }
  }

  const byLegacyOwnerId = await client
    .from("companies")
    .select(COMPANY_SESSION_COLUMNS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (byLegacyOwnerId.error) {
    throw byLegacyOwnerId.error;
  }

  const companies = byLegacyOwnerId.data ?? [];
  const currentCompany = companies.find((company) =>
    ACTIVE_ONBOARDING_STATUSES.has(company.onboarding_status)
  );

  return currentCompany ?? companies.find((company) => company.onboarding_status === "rejected") ?? null;
}

export async function getAuthContext() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  const session = data.session;
  const user = session?.user;

  if (!user) {
    return { session: null, profile: null, role: null, company: null };
  }

  const profile = await getCurrentProfile(user);
  const role = getProfileRole(profile);
  const company = role === "company" ? await getCompanyForUser(user) : null;

  logAuthDebug("auth context", {
    userId: user.id,
    userEmail: user.email,
    role,
    hasProfile: Boolean(profile),
    hasCompany: Boolean(company),
  });

  return { session, profile, role, company };
}

export async function buildCompanySession(session) {
  const user = session?.user;

  if (!user) {
    return { session: null, profile: null, company: null };
  }

  const profile = await getCurrentProfile(user);
  const role = getProfileRole(profile);
  if (role !== "company") {
    logAuthDebug("company rejected", {
      userId: user.id,
      userEmail: user.email,
      role,
      reason: "profile role is not company",
    });
    throw new Error(COMPANY_AUTH_ERRORS.NOT_COMPANY);
  }

  const company = await getCompanyForUser(user);
  if (!company) {
    throw new Error(COMPANY_AUTH_ERRORS.NO_COMPANY);
  }

  return { session, profile, role: "company", company };
}

export async function getCompanySession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return buildCompanySession(data.session);
}

export async function signInCompanyWithEmail(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return buildCompanySession(data.session);
}

export async function signInAdminWithEmail(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  const user = data.session.user;
  const profile = await getCurrentProfile(user);
  const role = getProfileRole(profile);

  if (role !== "admin") {
    logAuthDebug("admin rejected", {
      userId: user.id,
      userEmail: user.email,
      profile,
      role,
      reason: profile ? "profile role/account_type is not admin" : "profile not readable or missing",
    });
    await client.auth.signOut();
    throw new Error(COMPANY_AUTH_ERRORS.NOT_ADMIN);
  }

  logAuthDebug("admin accepted", {
    userId: user.id,
    userEmail: user.email,
    profile,
    role,
  });

  return { session: data.session, profile, role: "admin", company: null };
}

export async function sendCompanyPhoneOtp(phone) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    phone,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    if (isPhoneAuthError(error)) {
      throw new Error(COMPANY_AUTH_ERRORS.PHONE_DISABLED);
    }

    throw error;
  }
}

export async function verifyCompanyPhoneOtp(phone, token) {
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    if (isPhoneAuthError(error)) {
      throw new Error(COMPANY_AUTH_ERRORS.PHONE_DISABLED);
    }

    throw error;
  }

  return buildCompanySession(data.session);
}

export async function signOutCompany() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
