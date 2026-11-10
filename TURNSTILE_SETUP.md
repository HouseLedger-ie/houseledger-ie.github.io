# Activate Cloudflare Turnstile for HouseLedger

## Current state
The Supabase Edge Function `houseledger-submit` is **deployed** and contains server-side Cloudflare Siteverify. The frontend build and contact forms are already coded to use it once `turnstileSiteKey` is configured. It is **not active** yet because Cloudflare keys have not been provisioned. Existing anonymous forms continue using the database's duplicate/flood safeguards.

## Activation steps (order matters)

1. Log in to [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) and create a Managed widget for the exact allowed hostname `darraghpilko.github.io`. Name it HouseLedger. The GitHub Pages project path is not part of the hostname.
2. Copy the **secret key** only into the Supabase dashboard: project `aduciystfmwqwafsfhqq` → Edge Functions → Secrets → add `TURNSTILE_SECRET_KEY`. **Do not** put the secret in `config.js`, GitHub, chat or an HTML file.
3. Copy the **public site key** into `config.js` as `turnstileSiteKey`. This automatically switches the browser submissions and contact page to the deployed Edge Function. Verify the widget loads on both forms and submit both a test build and a private request.
4. **Crucial: close the old direct API bypass**. Run the following SQL using Supabase SQL Editor after the protected functions pass tests:

```sql
begin;
drop policy if exists "public may submit pending" on public.builds;
drop policy if exists "anyone can send a private privacy request" on public.privacy_requests;
commit;
```

The Edge Function uses the private server-side Supabase service-role credential supplied by the Supabase environment, with a strict field allowlist and mandatory Siteverify. The policies above must be disabled to prevent an attacker bypassing CAPTCHA with direct PostgREST calls. Once this is done, the server function is the only submission path.

5. Check that a direct anonymous REST POST to `/rest/v1/builds` and `/rest/v1/privacy_requests` is denied, while the forms still submit successfully.
6. Ensure the site's hostname is still `darraghpilko.github.io` when using the current Edge Function. If the site moves to a custom domain, update the function's allowed `Origin` and expected Siteverify hostname, and adjust the widget's hostname list before deployment.

## Notes

- Turnstile verification uses one-time tokens valid for 5 minutes; refresh the challenge if it expires.
- The backend fails closed (503) if the Turnstile secret is missing.
- CORS and hostname checks reduce browser misuse but do not replace CAPTCHA; the Siteverify request is the security enforcement step.
- Existing rate and duplicate limits remain in effect after switching to protected submissions.
- The privacy notice still needs the website operator's identity and legitimate GDPR processing/retention choices confirmed before promoting the website to the public.
