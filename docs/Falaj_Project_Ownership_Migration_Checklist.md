# Falaj Project Ownership Migration Checklist

## Purpose

This document is a safe, staged plan for moving Falaj project ownership from a personal account setup to the official project identity without breaking the current application.

This checklist is documentation only. It does not change Supabase, Vercel, GitHub, DNS, environment variables, or deployment settings.

## Official Identity

- Official domain: `appfalaj.com`
- Official email: `info@appfalaj.com`
- Domain/DNS manager: Squarespace Domains

## Critical Safety Rules

- Do not delete the personal account until every project account, deployment, DNS record, repository, environment variable, and login path has been tested under the official Falaj ownership.
- Do not rotate Supabase, Vercel, payment, or environment keys during the ownership transfer unless a separate key-rotation plan is approved.
- Do not remove existing collaborators or access before confirming the new organization/team access works.
- Do not change production DNS records until the target deployment is verified and rollback is ready.
- Keep `Falaj_Claude`, Cart, Checkout, and Payment untouched during this ownership migration.

## Accounts That Should Move Under `info@appfalaj.com`

- GitHub
- Supabase
- Vercel
- Squarespace Domains
- Google Play Console later
- Apple Developer later
- Payment Gateway later

Use `info@appfalaj.com` as the owner/admin identity where possible, and add personal accounts only as recoverable collaborators with the minimum required permissions.

## Email Plan

Recommended project mailboxes:

- `info@appfalaj.com`: general administration and primary ownership identity.
- `support@appfalaj.com`: customer support later.
- `partners@appfalaj.com`: supplier/company communication later.

Before using these addresses for critical platform ownership, confirm:

- mailbox access works,
- recovery methods are configured,
- 2FA is enabled,
- access is not tied to a single person only.

## Domain And DNS Plan

Domain manager:

- Squarespace Domains

DNS records to prepare later:

- `appfalaj.com`: main public application or landing entry.
- `www.appfalaj.com`: website alias to the main domain.
- `api.appfalaj.com`: optional future API/backend endpoint.
- `admin.appfalaj.com` or `dashboard.appfalaj.com`: optional future admin/company dashboard entry.

Do not point DNS to a new deployment until the Vercel target project is verified and rollback DNS values are saved.

## GitHub Ownership Plan

Recommended steps:

1. Create a GitHub Organization for the project, for example `Falaj` or `appfalaj`.
2. Add `info@appfalaj.com` as the organization owner/admin identity where GitHub permits it.
3. Enable 2FA for all owners.
4. Add the personal account as an owner temporarily during migration.
5. Transfer the repository to the organization, or create a new organization repository and push the existing repository there.
6. Confirm repository settings after transfer:
   - default branch,
   - branch protection,
   - GitHub Actions secrets if used later,
   - deploy hooks,
   - Vercel Git integration,
   - repository visibility.
7. Do not delete the original personal repository until Vercel and local development are confirmed against the organization repository.

## Vercel Ownership Plan

Recommended steps:

1. Create a Vercel Team named `Falaj`.
2. Invite the personal account as an admin during migration.
3. Move the existing `Falaj_Web` Vercel project into the team if supported.
4. If moving is not clean, create a new Vercel project under the `Falaj` team and reconnect it to the GitHub organization repository.
5. Copy environment variables manually and carefully:
   - do not change values automatically,
   - do not expose secret values in docs or commits,
   - verify `VITE_` variables are intended to be public client config.
6. Deploy a preview build first.
7. Only after preview verification, connect production domains.

## Supabase Ownership Plan

Recommended steps:

1. Create a Supabase Organization named `Falaj`, or transfer the current project to the Falaj organization if Supabase supports the current project transfer path.
2. Add `info@appfalaj.com` as the owner/admin identity.
3. Keep the personal account as an owner until all database, Auth, Storage, Edge Function, and billing checks pass.
4. Confirm the project URL and anon key remain stable if the project is transferred.
5. Do not rotate the service role key during ownership migration unless a separate key rotation is planned.
6. Confirm RLS policies remain enabled and unchanged.
7. Confirm Auth settings, SMS settings, email templates, and redirect URLs after the transfer.
8. Confirm Storage buckets and policies after the transfer.

## Pre-Migration Checklist

- Confirm current production or demo URL still works.
- Record current Vercel project settings and deployment URL.
- Record current GitHub repository URL and default branch.
- Record current Supabase project reference, project URL, anon key location, and owner list.
- Record current Squarespace DNS records before editing anything.
- Confirm access to `info@appfalaj.com`.
- Enable 2FA on all platform accounts.
- Confirm no local `.env` or Vercel env variable will be changed automatically.
- Confirm no service role key is stored in frontend code.
- Confirm a rollback contact and decision owner.
- Take screenshots or exports of important settings where the platform does not provide version history.

## Migration Checklist

- Create the Falaj GitHub Organization.
- Transfer or mirror the repository to the organization.
- Confirm local development can pull from the new repository remote.
- Create the Vercel Team named `Falaj`.
- Move or recreate the `Falaj_Web` Vercel project under the team.
- Reconnect Vercel to the GitHub organization repository.
- Manually copy required Vercel environment variables.
- Deploy a Vercel preview.
- Create or transfer Supabase into the Falaj organization.
- Confirm Supabase Auth, Database, Storage, and RLS settings.
- Add the official domain in Vercel, but do not switch DNS until the target deployment is verified.
- Prepare Squarespace DNS records for Vercel.
- Apply DNS changes during a low-risk window.
- Verify `appfalaj.com` and `www.appfalaj.com` after DNS propagation.

## Post-Migration Checklist

- Confirm `appfalaj.com` loads the expected deployment.
- Confirm `www.appfalaj.com` redirects or resolves as intended.
- Confirm login flows still work for company/admin users.
- Confirm Supabase reads/writes still work where enabled.
- Confirm Vercel production and preview deployments still trigger from GitHub.
- Confirm old personal repository/project is not the active production source.
- Confirm the personal account still has emergency access.
- Confirm `info@appfalaj.com` can receive platform alerts and billing emails.
- Document final ownership locations:
  - GitHub organization URL,
  - Vercel team/project URL,
  - Supabase organization/project URL,
  - Squarespace domain dashboard location.

## Rollback Plan

If deployment or DNS fails:

1. Do not delete any newly created organization/team/project.
2. Revert Squarespace DNS records to the previously recorded working values.
3. If Vercel transfer broke production, redeploy from the previous working Vercel project or reconnect the old GitHub repository temporarily.
4. If Supabase transfer affects access, keep using the same project URL/keys if unchanged and restore owner access through the personal account.
5. Pause further ownership changes until:
   - the failing platform is identified,
   - the last working deployment URL is confirmed,
   - environment variables are compared manually,
   - DNS propagation status is checked.
6. After service is restored, document the failure and retry in a smaller step.

## Do Not Delete Personal Account Yet

Do not delete or remove the personal account until all of the following are true:

- `info@appfalaj.com` owns or administers GitHub, Vercel, Supabase, and Squarespace Domains.
- Production deployment works from the official GitHub organization.
- Vercel production and preview builds work under the Falaj team.
- Supabase Auth, Database, Storage, and RLS are verified.
- DNS for `appfalaj.com` and `www.appfalaj.com` is stable.
- Billing and recovery emails go to the official project email.
- At least one backup admin account exists.

The personal account should remain as an emergency admin until the official ownership model has run successfully for a full verification period.
