# Falaj First Admin Setup

## Purpose

This guide explains how to create the first Falaj admin account safely for `Falaj_Web`.

The admin creation script is local-only and uses the Supabase service role key only from a local ignored file. Never place the service role key in frontend code, browser code, Git, Vercel public variables, or any committed file.

## Files

- Script: `scripts/create-first-admin.mjs`
- Local env file: `.env.admin.local`
- `.env.admin.local` is ignored by Git.

## Get `SUPABASE_URL`

1. Open the Supabase project dashboard.
2. Go to Project Settings.
3. Open API settings.
4. Copy the Project URL.
5. Put it only in `.env.admin.local` as `SUPABASE_URL`.

## Get `SUPABASE_SERVICE_ROLE_KEY`

1. Open the Supabase project dashboard.
2. Go to Project Settings.
3. Open API settings.
4. Copy the `service_role` key or the equivalent secret server key.
5. Put it only in `.env.admin.local` as `SUPABASE_SERVICE_ROLE_KEY`.

Important:

- The service role key bypasses RLS.
- Do not commit it.
- Do not paste it into browser DevTools.
- Do not add it to React/Vite code.
- Do not expose it as a `VITE_` environment variable.
- Do not put it in Vercel frontend/public environment variables.

## Create `.env.admin.local`

Create this file locally in the `Falaj_Web` folder:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVICE_ROLE_KEY_HERE
FIRST_ADMIN_EMAIL=info@appfalaj.com
FIRST_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD
FIRST_ADMIN_NAME=Falaj Admin
```

Use a real strong password in your local file. Do not use the placeholder password.

## Run The Script

From the `Falaj_Web` folder:

```powershell
node scripts/create-first-admin.mjs
```

If `node` is not available in your terminal PATH, use the local/runtime Node path available on your machine, then run the same script.

The script will:

1. Read `.env.admin.local`.
2. Validate required values.
3. Create a Supabase Auth user with confirmed email.
4. Upsert `profiles` with:
   - `id = auth user id`
   - `email = FIRST_ADMIN_EMAIL`
   - `full_name = FIRST_ADMIN_NAME`
   - `role = 'admin'`
   - `account_type = 'admin'`
5. Print a safe result without printing the password or service role key.

If the Auth user already exists, the script attempts to find the user id and then upsert the profile. If it cannot find the id, use Supabase Dashboard or SQL Editor to locate the Auth user id and upsert the `profiles` row manually.

## Test Admin Login

After creating the first admin:

1. Open `https://appfalaj.com/admin`.
2. Sign in with:
   - email: `info@appfalaj.com`
   - password: the strong password you placed locally in `.env.admin.local`
3. Confirm that the admin dashboard opens.
4. Confirm that non-admin accounts cannot open `/admin`, `/admin/finance`, `/admin/suppliers`, or `/admin/live-tracking`.

## Manual Profile Upsert Fallback

Only if the script cannot fetch an existing Auth user id, use the Supabase SQL Editor after finding the correct Auth user id:

```sql
insert into profiles (id, email, full_name, role, account_type)
values (
  'AUTH_USER_ID_HERE',
  'info@appfalaj.com',
  'Falaj Admin',
  'admin',
  'admin'
)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  account_type = excluded.account_type,
  updated_at = now();
```

Do not run this SQL with a guessed user id.
