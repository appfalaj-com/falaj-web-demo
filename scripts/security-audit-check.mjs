import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pagePath = resolve("src/pages/CompanySetPasswordPage.jsx");
const source = readFileSync(pagePath, "utf8");

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

if (failures.length) {
  console.error("Security audit check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security audit check passed.");
