import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ENV_FILE = ".env.admin.local";
const REQUIRED_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FIRST_ADMIN_EMAIL",
  "FIRST_ADMIN_PASSWORD",
  "FIRST_ADMIN_NAME",
];

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ENV_FILE);
  let rawEnv;

  try {
    rawEnv = readFileSync(envPath, "utf8");
  } catch {
    throw new Error(`Missing ${ENV_FILE}. Create it locally and do not commit it.`);
  }

  const values = {};

  rawEnv.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
  });

  return values;
}

function assertRequired(values) {
  const missing = REQUIRED_KEYS.filter((key) => !values[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required value(s) in ${ENV_FILE}: ${missing.join(", ")}`);
  }
}

function safeErrorMessage(error) {
  return error?.message || "Unknown Supabase error";
}

async function createAuthUser(supabase, email, password, fullName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (!error) {
    return { user: data.user, created: true };
  }

  const message = safeErrorMessage(error);
  if (!message.toLowerCase().includes("already")) {
    throw error;
  }

  return { user: null, created: false, alreadyExistsMessage: message };
}

async function findExistingUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;

    page += 1;
  }

  return null;
}

async function upsertAdminProfile(supabase, userId, email, fullName) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: "admin",
      account_type: "admin",
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

async function main() {
  const values = loadLocalEnv();
  assertRequired(values);

  const supabase = createClient(values.SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = values.FIRST_ADMIN_EMAIL;
  const fullName = values.FIRST_ADMIN_NAME;

  const authResult = await createAuthUser(
    supabase,
    email,
    values.FIRST_ADMIN_PASSWORD,
    fullName
  );

  let user = authResult.user;

  if (!user) {
    user = await findExistingUserByEmail(supabase, email);
  }

  if (!user?.id) {
    console.log("Admin Auth user already exists, but the script could not fetch the user id.");
    console.log("No secrets were printed.");
    console.log("Use Supabase Dashboard or SQL Editor to find the Auth user id, then upsert profiles manually.");
    process.exitCode = 1;
    return;
  }

  await upsertAdminProfile(supabase, user.id, email, fullName);

  console.log("First admin setup completed safely.");
  console.log(`Email: ${email}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Auth user created in this run: ${authResult.created ? "yes" : "no, already existed"}`);
  console.log("Profile role/account_type set to admin.");
  console.log("No password or service role key was printed.");
}

main().catch((error) => {
  console.error("First admin setup failed.");
  console.error(safeErrorMessage(error));
  console.error("No password or service role key was printed.");
  process.exitCode = 1;
});
