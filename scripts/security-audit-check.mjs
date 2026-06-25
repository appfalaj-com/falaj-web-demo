import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve("src/pages/CompanySetPasswordPage.jsx");
const source = readFileSync(pagePath, "utf8");
const driverLoginSource = readFileSync(resolve("src/pages/DriverLoginPage.jsx"), "utf8");
const driverServiceSource = readFileSync(resolve("src/services/driverService.js"), "utf8");
const companyLoginSource = readFileSync(resolve("src/pages/CompanyLoginPage.jsx"), "utf8");
const adminLoginSource = readFileSync(resolve("src/pages/AdminLoginPage.jsx"), "utf8");
const companyAuthSource = readFileSync(resolve("src/services/companyAuthService.js"), "utf8");

const failures = [];

if (/user_metadata\?\.(role|account_type)/.test(source)) {
  failures.push("CompanySetPasswordPage must not use auth user_metadata as role/account_type fallback.");
}

const ensureRecoverySessionMatch = source.match(/async function ensureRecoverySession\(\) \{([\s\S]*?)\n\}/);
if (!ensureRecoverySessionMatch) {
  failures.push("ensureRecoverySession() was not found.");
} else if (/getSession\s*\(/.test(ensureRecoverySessionMatch[1])) {
  failures.push("ensureRecoverySession() must not fall back to getSession().");
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
