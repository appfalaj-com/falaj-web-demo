import { supabase } from "../lib/supabaseClient.js";
import { clearExistingAuthSessionForLogin } from "./authSessionBoundary.js";

export const COMPANY_AUTH_ERRORS = {
  NOT_CONFIGURED: "لم يتم إعداد اتصال Supabase لهذا التطبيق.",
  NOT_COMPANY: "هذا الحساب غير مصرح له بالدخول إلى لوحة الموردين",
  NOT_ADMIN: "هذا الحساب غير مصرح له بالدخول إلى لوحة الإدارة",
  NO_COMPANY: "لا توجد شركة مرتبطة بهذا الحساب. يرجى التواصل مع إدارة فلج.",
  COMPANY_LOAD_FAILED: "تعذر تحميل بيانات الشركة المرتبطة بالحساب.",
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
  console.debug(`[Falaj auth] ${label}`, sanitizeAuthDebugPayload(payload));
}

function sanitizeAuthDebugPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const sanitized = { ...payload };
  delete sanitized.userEmail;
  delete sanitized.email;
  delete sanitized.profile;

  return sanitized;
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
  "id, name, email, phone, logo_url, is_active, commission_rate, owner_id, onboarding_status, updated_at, created_at";
const ACTIVE_ONBOARDING_STATUSES = new Set([
  "invitation_sent",
  "pending_setup",
  "company_created",
  "activated",
]);
const COMPANY_LOGO_BUCKET = "company-logos";
const COMPANY_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const COMPANY_LOGO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

    if (byMetadataCompany.data?.owner_id === userId) {
      return byMetadataCompany.data;
    }

    logAuthDebug("metadata company rejected", {
      userId,
      metadataCompanyId,
      companyOwnerId: byMetadataCompany.data?.owner_id,
      reason: "company owner_id does not match authenticated user",
    });
  }

  const byLegacyOwnerId = await client
    .from("companies")
    .select(COMPANY_SESSION_COLUMNS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

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
    return { session: null, user: null, profile: null, role: null, company: null, companyError: "" };
  }

  const profile = await getCurrentProfile(user);
  const role = getProfileRole(profile);
  let company = null;
  let companyError = "";

  if (role === "company") {
    try {
      company = await getCompanyForUser(user);
    } catch (error) {
      companyError = error.message || COMPANY_AUTH_ERRORS.COMPANY_LOAD_FAILED;
    }
  }

  logAuthDebug("auth context", {
    userId: user.id,
    userEmail: user.email,
    metadataCompanyId: user.user_metadata?.company_id,
    role,
    hasProfile: Boolean(profile),
    hasCompany: Boolean(company),
    companyId: company?.id,
    companyOnboardingStatus: company?.onboarding_status,
    companyError,
  });

  return { session, user, profile, role, company, companyError };
}

export async function buildCompanySession(session) {
  const user = session?.user;

  if (!user) {
    return { session: null, user: null, profile: null, company: null };
  }

  const profile = await getCurrentProfile(user);
  const role = getProfileRole(profile);
  if (!profile) {
    logAuthDebug("company rejected", {
      userId: user.id,
      userEmail: user.email,
      reason: "profile is missing",
    });
    throw new Error("حساب المورد غير مكتمل الربط. يرجى التواصل مع إدارة فلج.");
  }

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

  return { session, user, profile, role: "company", company };
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
  await clearExistingAuthSessionForLogin();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return buildCompanySession(data.session);
}

export async function sendCompanyEmailMagicLink(email) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/company/set-password`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    throw error;
  }
}

export async function sendCompanyPasswordReset(email) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/company/set-password`,
  });

  if (error) {
    throw error;
  }
}

export async function signInAdminWithEmail(email, password) {
  const client = requireSupabase();
  await clearExistingAuthSessionForLogin();
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

  return { session: data.session, user, profile, role: "admin", company: null };
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

export function validateCompanyLogoFile(file) {
  if (!file) return "";
  if (!COMPANY_LOGO_ALLOWED_TYPES.includes(file.type)) {
    return "يرجى اختيار شعار بصيغة JPG أو PNG أو WebP.";
  }
  if (file.size > COMPANY_LOGO_MAX_SIZE_BYTES) {
    return "حجم الشعار يجب ألا يتجاوز 2MB.";
  }
  return "";
}

export async function updateCompanyLogo(companyId, file) {
  const client = requireSupabase();
  const validationError = validateCompanyLogoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const filePath = `logos/${companyId}/${Date.now()}-${safeFileName(file.name, file.type, "company-logo")}`;
  const { error: uploadError } = await client.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = client.storage.from(COMPANY_LOGO_BUCKET).getPublicUrl(filePath);
  const logoUrl = publicUrlData.publicUrl;

  const { data, error } = await client.rpc("update_own_company_logo", {
    p_company_id: companyId,
    p_logo_url: logoUrl,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

function safeFileName(name, mimeType, fallbackName) {
  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByType[mimeType] ?? (name.includes(".") ? name.split(".").pop().toLowerCase() : "jpg");
  const baseName = name
    .replace(/\.[^/.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${baseName || fallbackName}.${extension}`;
}
