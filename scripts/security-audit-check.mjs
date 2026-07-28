import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve("src/pages/CompanySetPasswordPage.jsx");
const source = readFileSync(pagePath, "utf8");
const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
const appSource = readFileSync(resolve("src/App.jsx"), "utf8");
const driverLoginSource = readFileSync(resolve("src/pages/DriverLoginPage.jsx"), "utf8");
const driverServiceSource = readFileSync(resolve("src/services/driverService.js"), "utf8");
const companyLoginSource = readFileSync(resolve("src/pages/CompanyLoginPage.jsx"), "utf8");
const adminLoginSource = readFileSync(resolve("src/pages/AdminLoginPage.jsx"), "utf8");
const companyAuthSource = readFileSync(resolve("src/services/companyAuthService.js"), "utf8");
const sendDriverInviteSource = readFileSync(resolve("supabase/functions/send-driver-invite/index.ts"), "utf8");
const companyResetSource = readFileSync(resolve("supabase/functions/company-request-password-reset/index.ts"), "utf8");

const failures = [];

if (/user_metadata\?\.(role|account_type)/.test(source)) {
  failures.push("CompanySetPasswordPage must not use auth user_metadata as role/account_type fallback.");
}

const ensureRecoverySessionBody = getFunctionBody(source, "ensureRecoverySession");
const handleSubmitBody = getFunctionBody(source, "handleSubmit");

const ensureRecoverySessionMatch = Boolean(ensureRecoverySessionBody);
if (!ensureRecoverySessionMatch) {
  failures.push("ensureRecoverySession() was not found.");
} else if (/getSession\s*\(/.test(ensureRecoverySessionBody)) {
  failures.push("ensureRecoverySession() must not fall back to getSession().");
}

if (ensureRecoverySessionBody) {
  if (!ensureRecoverySessionBody.includes('["invite", "recovery"].includes(otpType)')) {
    failures.push("token_hash password setup links must accept only invite/recovery OTP types.");
  }

  if (!ensureRecoverySessionBody.includes('["invite", "recovery"].includes(hashType)')) {
    failures.push("hash access_token password setup links must accept only invite/recovery types.");
  }

  if (!/await\s+supabase\.auth\.signOut\(\);\s*const\s+\{\s*data,\s*error\s*\}\s*=\s*await\s+supabase\.auth\.setSession/.test(ensureRecoverySessionBody)) {
    failures.push("hash access_token password setup must sign out before setSession().");
  }
}

if (handleSubmitBody && /updateUser\(\{\s*password\s*\}\)/.test(handleSubmitBody)) {
  const updatePasswordIndexInSubmit = handleSubmitBody.indexOf("updateUser({ password })");
  const submitGuard = handleSubmitBody.slice(Math.max(0, updatePasswordIndexInSubmit - 900), updatePasswordIndexInSubmit);
  if (!submitGuard.includes("sessionData.session.user?.id !== recoveryUserId")) {
    failures.push("handleSubmit() must verify recoveryUserId immediately before updateUser().");
  }
  if (!submitGuard.includes("validateRecoveryAccount(sessionData.session, accountKind)")) {
    failures.push("handleSubmit() must validate account kind immediately before updateUser().");
  }
}

const updatePasswordIndex = source.indexOf("updateUser({ password })");
if (updatePasswordIndex === -1) {
  failures.push("Password update call was not found.");
} else {
  const precedingGuard = source.slice(Math.max(0, updatePasswordIndex - 900), updatePasswordIndex);
  if (!precedingGuard.includes("sessionData.session.user?.id !== recoveryUserId")) {
    failures.push("Password update must verify the current session still matches recoveryUserId.");
  }
  if (!precedingGuard.includes("validateRecoveryAccount(sessionData.session, accountKind)")) {
    failures.push("Password update must validate the recovery account kind immediately before updateUser().");
  }
}

if (/resolveDriverLoginIdentifier/.test(driverLoginSource) || /resolve_driver_login_identifier/.test(driverServiceSource)) {
  failures.push("Driver phone login must not call a client-side phone-to-email resolver.");
}

if (
  /sendDriverInviteEmail\([^)]*\.actionLink/.test(sendDriverInviteSource) ||
  /sendDriverInviteEmail\([^)]*action_link/.test(sendDriverInviteSource)
) {
  failures.push("Driver invite emails must not contain direct Supabase one-time action links.");
}

if (!sendDriverInviteSource.includes("createDriverAcceptLink")) {
  failures.push("Driver invite emails must use intermediate Falaj accept links.");
}

if (/resetPasswordForEmail\s*\(/.test(companyAuthSource)) {
  failures.push("Company password reset must not send direct Supabase one-time links from the frontend.");
}

if (!/\.functions\.invoke\("company-request-password-reset"/.test(companyAuthSource)) {
  failures.push("Company password reset must go through the intermediate company-request-password-reset function.");
}

if (!companyResetSource.includes("COMPANY_RESET_TICKET_TTL_MINUTES = 60")) {
  failures.push("Company reset tickets must expire after 60 minutes.");
}

if (!sendDriverInviteSource.includes("DRIVER_INVITE_TICKET_TTL_MINUTES = 60")) {
  failures.push("Driver invite tickets must expire after 60 minutes.");
}

if (/href="\$\{escapeHtml\((?:inviteLinkResult\.actionLink|actionLinkResult\.actionLink|data\.properties\.action_link|action_link)\)\}/.test(sendDriverInviteSource)) {
  failures.push("Driver invite email templates must not render direct Supabase action links.");
}

if (!appSource.includes('accountKind="driver"') || !appSource.includes('accountKind="company"')) {
  failures.push("App routes must pass explicit accountKind values to set-password pages.");
}

if (!existsSync(resolve("COD_CONTRACT.md"))) {
  failures.push("COD_CONTRACT.md must exist before customer checkout work starts.");
}

if (!existsSync(resolve("COD_RPC_TEST_MATRIX.md"))) {
  failures.push("COD_RPC_TEST_MATRIX.md must exist before customer checkout work starts.");
}

if (!packageJson.scripts?.["test:e2e"]) {
  failures.push("package.json must expose a test:e2e script for role-boundary regression tests.");
}

if (!existsSync(resolve("playwright.config.mjs")) || !existsSync(resolve("tests/e2e/auth-boundaries.spec.mjs"))) {
  failures.push("Playwright auth-boundary tests must be present.");
}

for (const [label, loginSource] of [
  ["DriverLoginPage", driverLoginSource],
  ["CompanyLoginPage", companyLoginSource],
  ["AdminLoginPage", adminLoginSource],
]) {
  if (!loginSource.includes("clearExistingAuthSessionForLogin")) {
    failures.push(`${label} must clear any existing cross-role session on mount.`);
  }
}

for (const [label, serviceSource] of [
  ["driverService", driverServiceSource],
  ["companyAuthService", companyAuthSource],
]) {
  if (!serviceSource.includes("clearExistingAuthSessionForLogin")) {
    failures.push(`${label} must clear any existing session before role-specific sign in.`);
  }
}

if (failures.length) {
  console.error("Security audit check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security audit check passed.");

function getFunctionBody(fileSource, functionName) {
  const signature = `function ${functionName}`;
  const start = fileSource.indexOf(signature);
  if (start === -1) return "";

  const openBrace = fileSource.indexOf("{", start);
  if (openBrace === -1) return "";

  let depth = 0;
  for (let index = openBrace; index < fileSource.length; index += 1) {
    const char = fileSource[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return fileSource.slice(openBrace + 1, index);
    }
  }

  return "";
}
