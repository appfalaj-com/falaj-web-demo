# Oman Operation Compliance Notes

Checkpoint: `Falaj_SupabaseHosted_ProductionFoundation_20260615`

## Scope

These notes are operational and compliance reminders for running Falaj in Oman.

They are not legal advice. Falaj should get local legal/operational review before a real production launch.

## Personal Data

Falaj may process personal data such as:

- customer full name
- phone number
- email address
- delivery address
- address details and landmarks
- location coordinates
- order history
- payment method
- cash collection status
- ratings and comments

Driver/company operational data may include:

- driver name
- driver phone
- vehicle plate
- live/last known location
- assigned order history
- cash collection records

## Privacy Policy and Consent

Before production launch:

- Publish a clear privacy policy.
- Explain what data is collected and why.
- Get user consent for account, address, order, and location data.
- Explain how location data is used for delivery.
- Explain whether data is shared with companies/drivers.
- Provide a support contact for privacy/data requests.

## Current Version Is Not Production

The current version must be treated as:

- pilot/demo
- mock workflow
- not connected to real payment
- not connected to production Supabase data yet

Do not present the current app as a fully production-ready marketplace until security, privacy, and operations are reviewed.

## Payment Notes

The safe pilot approach is:

- start with cash pilot
- keep payment status simple
- record cash collection carefully
- avoid real card/payment flow until a licensed payment provider and operating process are selected

Electronic payments later require:

- payment provider selection
- review of fees/refunds/chargebacks
- user payment terms
- operational reconciliation process
- compliance/legal review
- separation of public keys and secret keys

Never put payment secret keys in frontend apps.

## Supabase and Data Security

Before real data:

- enable and test RLS
- restrict private data reads
- use anon key only with proper RLS
- keep service role key server-side only
- avoid exposing driver locations broadly
- avoid exposing customer addresses beyond assigned delivery needs

## Operational Recommendations

For a first controlled pilot:

1. Use a small number of trusted companies.
2. Use cash only.
3. Use limited service areas.
4. Use test/pilot users who understand this is a pilot.
5. Monitor support issues manually.
6. Keep audit logs for order status changes.
7. Keep company and driver onboarding manual at first.

## Data Retention

Before production, decide:

- how long to keep completed orders
- how long to keep location coordinates
- how long to keep driver assignment history
- when users can request account deletion
- how to handle inactive companies/drivers

## Minimum Pre-production Checklist

Before production:

- Privacy policy published.
- Terms of use drafted.
- RLS implemented and tested.
- Supabase secrets secured.
- Payment provider decision made if card payments are enabled.
- Customer support process ready.
- Company onboarding process ready.
- Driver operational process ready.
- Data backup and incident response approach defined.
