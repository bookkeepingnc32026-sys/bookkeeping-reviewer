# Bookkeep · Bookkeeping NC III Reviewer

A Next.js App Router / TypeScript learning platform with Supabase Auth and PostgreSQL, Tailwind CSS, shadcn-style Radix buttons, Lucide icons, and Motion animations. The cream, yellow, and navy design follows the supplied reference.

## Run locally

Requires Node.js 20.9+ and npm.

```powershell
npm install
Copy-Item .env.example .env.local # only if .env.local does not already exist
npm run dev
```

Open http://127.0.0.1:3000. The supplied project URL and publishable key are already in the ignored `.env.local`. Never commit local environment files. The application never needs a service-role key.

`/` is the public landing page. `/demo/dashboard` is a functional browser-local learning preview with explicitly illustrative content. Sample progress remains in that browser only; reset it from preview settings. The live `/learn/*` and `/admin/*` routes use authenticated Supabase records and never install sample questions or videos.

## Activate the database

1. Open your Supabase project's SQL editor.
2. Run `supabase/migrations/202610190001_platform.sql`, then `supabase/migrations/202610190002_content_guards.sql`, **once each, in that order**. They are transactional migrations; do not rerun a migration after success. Use versioned follow-up migrations for later changes.
3. In Authentication → Providers → Email, enable email/password authentication **and Confirm email**. Set a minimum password length of 8 (the application enforces it too). Enable secure email change confirmation and configure an email provider for reliable delivery.
4. Set Authentication → URL Configuration → Site URL to your deployed origin. Add `http://localhost:3000/auth/callback`, `http://127.0.0.1:3000/auth/callback`, and your production `/auth/callback` URL to Redirect URLs. Keep production redirects narrowly scoped.
5. The confirmation and recovery flow supports PKCE `code` callbacks. If using token-hash email templates, use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` for confirmations and `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery` for recovery. Use the appropriate `email_change` type for email-change templates. Templates must preserve the correct destination.
6. Set `NEXT_PUBLIC_APP_URL` to the origin used in that environment. Restart the dev server after changing environment variables.

If you can log in but see “The database needs setup”, Auth is working but the application schema is missing. For a fresh database, run `npm run db:prepare`, open `supabase/setup.sql`, and paste the entire file into a new Supabase SQL Editor query. Run it once, then reload your learner dashboard. This generated file combines both migrations in a single transaction and creates learner profiles for pre-existing Auth accounts. Use either this combined file or the two individual migrations, not both. If Supabase reports an error, retain the exact error and fix it before rerunning; do not delete existing tables or your Auth account.

The migration creates five editable competency categories. They are configurable starting labels, not an assertion of official TESDA curriculum. Add your own approved educational content through the administrator portal. No sample content is represented as accredited.

## Securely provision the initial administrator

Register and confirm your own learner account first. Run this in the trusted Supabase SQL editor, replacing only the email address:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'your-verified-email@example.com');
```

Sign out and log in again. Role assignment is never exposed in public registration or profile forms. Auth metadata cannot assign an administrator role. The role column has no authenticated-client update grant. Provision any further administrator accounts through the same trusted process. No hardcoded credentials exist.

## Content and learner workflows

- **Administrator:** add a lesson with an embeddable unlisted YouTube link, accurate duration in seconds, competency, order, and 3–5 summary points. Add 1–5 questions and assign their lesson for quick checks. Add questions without a lesson to make them exam-bank-only. The exam can draw from both. Add journal exercises with a list of accounts, correct debit and credit, and an explanation. Add flashcards and publish/deactivate announcements. Edit competency labels and examination settings.
- **CSV:** UTF-8 CSV with `question, option A, option B, option C, correct answer, competency`. Correct answers are A/B/C; competency is an exact category name or UUID. Quoted commas and line breaks are supported. Imports show all row errors and are atomic: no rows persist if any row fails.
- **Learner:** confirm email, log in, complete/skip setup, watch a lesson, try its quick check, practice journal entries, review due cards, and take a timed exam. The dashboard and checklist update from stored activity. Lesson position saves every five seconds and on pause; completion is reported when playback ends and the configured duration threshold is reached. Accurate lesson durations are important.
- **Flashcards:** unknown cards return later in the session and reset their interval. Known cards progress through 1/3/7/14 days. Sessions persist on the server and resume. Completing at least five distinct cards qualifies for the badge and session XP.
- **Exams:** new attempts snapshot question count, question order, option order, time limit, pass mark, and reward. Existing active attempts resume. The server verifies expiry, current question, and each answer. On expiry, the server finalizes the result when the active client auto-submits or the learner next accesses the attempt. No background scheduler is needed; an unattended expired attempt is finalized on its next access. Unanswered items count against the denominator. Answers are final and cannot be replayed. Active examination questions cannot be edited or deleted.
- **XP:** 10 per first correct quick check; 20 per first completed lesson; 15 per first correct journal item; 50 once for the complete onboarding checklist. Configurable exam/flashcard XP is limited to one qualifying completion per learner-local date. Exam XP requires answering all questions. Flashcard XP requires at least five distinct reviewed cards. Unique constraints prevent duplicate rewards.
- **Levels:** 250 XP per level. Daily goals are 1/3/5 qualifying activities. Streaks use the profile timezone, with yesterday counting until today is missed. The leaderboard uses a shared Monday-to-Monday **Asia/Manila** week, includes only explicit opt-ins, and returns only display name, weekly XP, and current-user status.
- **Themes:** light/dark/follow-device preference is saved to the profile. All key dialogs trap focus, close with Escape, and return focus. Reduced-motion preferences disable decorative animation.

## Security design

All public tables enable RLS. Learner private tables have owner-only reads and no direct client scoring writes. All scoring and XP mutations use database transactions in narrowly scoped `SECURITY DEFINER` functions with empty search paths and explicit identity/role checks. Answer keys, active exam question order, and flashcard session state are stored in an unexposed `private` schema. Keys are not present in learner bootstrap responses. Administrator key access is an authorized RPC. Exam answer feedback is withheld until scoring is final. API mutation requests also validate input and same-origin requests; sessions are verified with Supabase `getUser`, refreshed through Next.js Proxy, and used for all RLS calls. Account email/password changes require the current password.

Administrator functions run with the signed-in user's JWT; there is no service-role key in the application. The database SQL editor is required for initial provisioning and schema changes. Restrict access to that editor. Supabase Auth handles password storage, confirmation, rate limits, and secure sessions.

## Checks

```powershell
npm run typecheck
npm test
npm run test:browser # with local server running; uses Chrome on Windows
npm run build
npm start
```

The database tests execute the actual migration in an in-memory PostgreSQL runtime (PGlite), simulate Supabase authenticated roles, and verify RLS isolation, role escalation prevention, atomic imports, repeat-reward prevention, flashcard scheduling, exam expiry/replay/shuffled scoring, and safe leaderboard output. These tests do not modify your live Supabase project. Utility tests cover timezone boundaries, streak gaps, redirects, CSV edge cases, and video URL validation. Live Supabase email delivery and YouTube playback require end-to-end checks with your own accounts and videos.

## Deploy to Vercel

Import this repository in Vercel with its default Next.js settings. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL` for production. The Supabase URL must be the project origin, **without `/rest/v1/`**. Enable the Auth settings and redirect URLs above. Deploy, then test signup → confirmation → login, password recovery, an administrator-created video lesson, and a complete learner exercise/exam. Never expose a service-role key with a `NEXT_PUBLIC_` name.

This project targets the requested Next.js/Vercel stack; it does not replace server behavior with a static Sites deployment. GitHub push and Vercel publication require your chosen repository and deployment account. Hero photography is loaded from Unsplash; if third-party imagery is blocked, replace that URL with a licensed local asset. No paid services or API subscriptions are introduced.

Browser checks use the installed Chrome executable on Windows; set `BROWSER_EXECUTABLE` to override its path on other machines. Screenshots are saved under the ignored `test-results/` directory. `npm run format` formats source and documentation. Git has been initialized; add your own GitHub remote when ready.
