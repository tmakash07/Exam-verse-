# ExamVerse

Next.js 14 + TypeScript + Tailwind frontend, Firebase backend (Auth, Firestore, Storage, Cloud Functions v2, App Check).

## How security works
- `exams/{id}/questions/*` (holds `correctAnswer`) is **admin-only** in Firestore rules. Students never read it.
- `startExam` (Cloud Function) shuffles questions + options, stores an answer-free paper on the attempt, and keeps the key in `attemptKeys/{attemptId}` (rules: no client access).
- Attempts, answers, user stats, leaderboards, achievements are written **only** by functions. Students may write only `responses/{qid}` drafts (`selectedAnswer`, `marked`, `timeSpent`) while the attempt is `in_progress` and before `deadline + 15s`.
- `submitExam` / `autoSubmitExpiredExam` score inside a Firestore transaction (idempotent: status must be `in_progress`).
- Admin = custom claim `admin: true`. Rules check `request.auth.token.admin`. UI checks are cosmetic.

## Setup
1. Firebase console: create project, enable Auth (Email/Password + Google), Firestore (region `asia-south1`), Storage.
2. Cloud Functions need the **Blaze (pay-as-you-go)** plan. Free quota is generous, but a card is required.
3. `cp .env.example .env.local` and fill the web config values.
4. `npm i -g firebase-tools && firebase login && firebase use <project-id>`
5. Set the first admin email, then deploy:
   ```
   echo 'ADMIN_BOOTSTRAP_EMAIL=you@example.com' > functions/.env.<project-id>
   cd functions && npm i && cd ..
   firebase deploy --only firestore,storage,functions
   ```
6. Sign up on the site using that exact email: you get the admin claim automatically.
7. Open `/admin` and tap **Seed sample data** (7 exams, 36 questions, achievements, today's daily challenge).
8. `npm i && npm run dev`, then deploy the frontend to Vercel (set the same env vars).

## App Check
Register the web app with reCAPTCHA v3 in Firebase App Check, put the site key in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, test, then set `ENFORCE_APP_CHECK=true` in `functions/.env.<project-id>` and enable enforcement for Firestore/Storage in the console.

## Notes / known limits
- Question-bank text search filters inside a fetched page of 100 (Firestore has no full-text search). Use Algolia/Typesense if the bank gets huge.
- Exam list filters (category/difficulty/duration) run client-side over paginated results to avoid index explosion.
- Language setting is stored but UI strings are English only.
- Premium flag is a filter only (no payment flow).
- Certificates folder has rules but no feature yet.
- Not yet run against a live Firebase project or the emulator. Run `firebase emulators:start` and test the flows first.
