# Production authentication verification

Verified on **27 October 2026**, Asia/Manila, against
**https://bookkeeping-reviewer-2xwo.vercel.app**.

## Configuration verified

- Supabase Site URL uses the public website above. The confirmation and password-recovery callbacks are allowed.
- Custom Gmail SMTP authenticates over STARTTLS on port 587. The sender name is **Bookkeep NC III Reviewer**.
- Supabase's email-sending limit is **50 messages per hour**. Gmail's own provider limits also apply.
- Email confirmation remains required. Signup, recovery, and email-change templates use the public server callback and token hashes.
- Both Vercel projects associated with this repository have Vercel Authentication disabled, including the older address present in previously delivered emails.
- The profile-recovery migration is installed in the live database.

## Live checks

The email tests used disposable addresses in an inbox controlled by the project owner, random passwords, and the deployed application's API.

| Check | Result |
| --- | --- |
| Fresh signup through `/api/auth` | HTTP 200 |
| Login before email confirmation | Rejected with “Email not confirmed” |
| Confirmation email delivery | Arrived in Gmail's inbox from the configured sender |
| Confirmation URL | Public `/auth/callback` with `token_hash`; no localhost or protected deployment address |
| Confirmation without the original signup cookies | HTTP 307 to the public learner dashboard; session created |
| Dashboard page and authenticated data | HTTP 200; correct learner account |
| Wrong password | Rejected |
| Logout | Session cookies cleared; unauthenticated data request returned HTTP 401 |
| Password login after confirmation | HTTP 200; same learner account and dashboard data |
| Reuse of a consumed confirmation link | Rejected with an actionable confirmation-error page |
| Password-recovery email | Delivered with the public recovery callback |
| Recovery without signup cookies | Opened `/reset-password`; password update and subsequent login passed |
| Missing profile and onboarding recovery | Live disposable profile was restored with the original user ID and learner role |
| Anonymous profile-recovery request | HTTP 401; no access granted |
| Public callback/error/resend and origin checks | Passed |

Before custom SMTP was configured, a real fresh signup reproduced Supabase's email quota failure. The deployed API now preserves HTTP 429 and returns `email_rate_limited` with clear guidance instead of treating it as signup success.

## Automated checks and cleanup

The current application changes passed **37 automated tests**, TypeScript checking, and the production build. Supabase settings were read back after the live tests to confirm custom SMTP, token-hash templates pinned to the public callback, and required email confirmation.

Disposable Auth accounts created for verification were deleted after testing. Existing learner accounts and passwords were left unchanged. Credentials and verification tokens were kept out of Git; the SMTP password is held in the ignored local SMTP file and Supabase's SMTP configuration.

For setup and maintenance, see [production-auth.md](production-auth.md). Passing these checks verifies the tested flows; delivery remains subject to the configured quotas and recipient mail filtering.

## Follow-up: confirmation from an older deployment

A subsequent learner signup used `bookkeeping-reviewer.vercel.app`. A live reproduction showed that its email placed `token_hash` on the old Site URL's homepage rather than `/auth/callback`. The homepage did not verify that token, leaving the Auth account unconfirmed even after the recipient clicked the email.

The follow-up change:

- Sends old production aliases to the canonical website, preserving paths and query parameters.
- Forwards verification parameters misplaced on the homepage to the server callback before rendering the landing page.
- Maps legacy application-origin settings to the canonical origin and aligns the older Vercel project's public URL setting.
- Pins all three hosted email-template links to the public callback instead of relying on an incoming deployment URL or a stale Site URL.

The exact previously broken test email was then opened without signup cookies. It followed the old homepage → canonical homepage → callback → learner dashboard, successfully verified the token, and allowed password login. A second fresh signup entered through the older website and also passed email delivery, confirmation, dashboard loading, and password login. All three old production aliases were checked for canonical signup redirects. Normal homepage visits remain static and do not trigger a Supabase session lookup.

The learner also completed a fresh signup and confirmed successful login; the live Auth record showed both email confirmation and a successful sign-in. Disposable reproduction accounts were removed after verification. No address was manually marked confirmed, and the learner's password was not read or changed.
