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

function isPhoneAuthError(error) {
  const message = `${error?.message ?? ""} ${error?.name ?? ""}`.toLowerCase();
  return (
    message.includes("sms") ||
    message.includes("phone") ||
    message.includes("provider") ||
    message.includes("otp")
  );
}

export function getProfileRole(profile) {
  return profile?.role ?? profile?.account_type ?? null;
}

export async function getCurrentProfile(userId) {
  const client = requireSupabase();
  const withRole = await client
    .from("profiles")
    .select("id, full_name, phone, email, role, account_type")
    .eq("id", userId)
    .maybeSingle();

  if (!withRole.error) {
    return withRole.data;
  }

  const fallback = await client
    .from("profiles")
    .select("id, full_name, phone, email, account_type")
    .eq("id", userId)
    .maybeSingle();

  if (fallback.error) {
    throw fallback.error;
  }

  return fallback.data;
}

export async function getCompanyForUser(userId) {
  const client = requireSupabase();
  const withStatus = await client
    .from("companies")
    .select(
      "id, name, email, phone, is_active, status, commission_rate, owner_user_id, owner_id"
    )
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (!withStatus.error) {
    return withStatus.data;
  }

  const byLegacyOwnerId = await client
    .from("companies")
    .select("id, name, email, phone, is_active, owner_id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (byLegacyOwnerId.error) {
    throw byLegacyOwnerId.error;
  }

  return byLegacyOwnerId.data;
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

  const profile = await getCurrentProfile(user.id);
  const role = getProfileRole(profile);
  const company = role === "company" ? await getCompanyForUser(user.id) : null;

  return { session, profile, role, company };
}

export async function buildCompanySession(session) {
  const user = session?.user;

  if (!user) {
    return { session: null, profile: null, company: null };
  }

  const profile = await getCurrentProfile(user.id);
  if (getProfileRole(profile) !== "company") {
    throw new Error(COMPANY_AUTH_ERRORS.NOT_COMPANY);
  }

  const company = await getCompanyForUser(user.id);
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

  const profile = await getCurrentProfile(data.session.user.id);
  if (getProfileRole(profile) !== "admin") {
    await client.auth.signOut();
    throw new Error(COMPANY_AUTH_ERRORS.NOT_ADMIN);
  }

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
