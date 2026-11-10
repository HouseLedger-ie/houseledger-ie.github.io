# HouseLedger

Ireland's crowdsourced self-build cost comparison website.

## Status
**Pre-launch beta** — code is connected to Supabase, but GitHub Pages has not yet been enabled. Do not promote to Reddit until launch safeguards and end-to-end tests are complete.

## Files
- `index.html` — public listing/search, comparisons, submission form, optional cost breakdown and Excel/CSV browser import.
- `admin.html` — authenticated admin moderation page.
- `config.js` — public Supabase URL and publishable key (safe to ship; never add secret/service-role keys).
- `privacy.html` — **DRAFT** with incomplete details; replace before sharing.

## Hosting
To publish a non-commercial test instance, visit GitHub repository **Settings → Pages**, select **Deploy from a branch**, `main`, `/(root)`, and Save. Confirm GitHub Pages' usage restrictions if the site becomes commercial, or use an appropriate static host.

## Required before public Reddit launch
1. Finalize GDPR privacy notice, actual contact route and correction/removal mechanism.
2. Implement server-side bot detection / abuse limits for anonymous public submissions, currently permitted without throttle.
3. Run full website submission → pending → admin approval/rejection → listing checks, including phone and spreadsheet uploads.
4. Set up backups and moderation practices.
5. Remove fictional/sample results from real-build listings or mark them unmistakably as demo examples.

Moderator account was assigned in Supabase `public.admins`; log in via `admin.html`. Submitted spreadsheets are parsed within the browser and not directly uploaded to Supabase.

## November 2026 admin and protection updates
- Admin dashboard now lists pending, approved, and rejected entries. An administrator can edit fields and permanently delete records with an explicit typed confirmation.
- Database RLS permits deletion only for admins. Verified edit and delete permissions using a rolled-back test transaction.
- Server-side basic abuse safeguards reject repeated identical submissions within 15 minutes and cap submissions at 60 within a 10-minute window; this is **not** a replacement for CAPTCHA or an IP-aware abuse control.
- Expanded privacy draft explains spreadsheet handling and hosting. **Do not invite public submissions** until a real privacy contact, lawful basis and retention policy are confirmed.
- Supabase Auth advisor reports leaked-password protection is not enabled; consider enabling it for the administrator account.
