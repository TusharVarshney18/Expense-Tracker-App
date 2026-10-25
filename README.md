# Expense Counter

A private expense tracker with receipt photos and 1:1 chat, built with Expo
(React Native), Supabase and SQLite. Made by **Tushar**.

- Package: `com.tushar.expensecounter`
- Version: 1.0.0
- Platform target: Google Play (Android); iOS configured for parity.

## Features

- Expense tracking with categories, notes and optional receipt photos.
- Shared groups with invite codes, equal expense splits, balances and settle-up records.
- Offline-first: expenses are cached in local SQLite.
- Private 1:1 chat with **report** and **block** (blocked messages hidden in both
  directions via Row Level Security).
- Optional biometric app lock.
- Push notifications for chat and reminders.
- **Delete Account** that wipes the Supabase profile, expenses, messages and push
  token plus the local database, then signs out.
- In-app Privacy Policy and Terms of Service.

## Project structure

```
app/                     Expo Router routes
  _layout.tsx            Root stack + auth routing + biometric lock screen
  (auth)/                Sign in / sign up
  (tabs)/                Expenses, Groups, Chat, Settings
  group/[id].tsx         Shared group ledger, members and settle-up
  chat/[id].tsx          Conversation with report / block
  expense/new.tsx        Add expense (with receipt picker)
  legal/                 Privacy Policy and Terms screens
src/
  components/            Reusable UI
  context/               AuthProvider
  hooks/                 useExpenses, useMessages, useConversations, useBlockedUsers
  lib/                   supabase client, sqlite db, notifications, biometrics, storage
  services/              account deletion, groups, moderation (report/block)
  content/legal.ts       In-app legal copy (single source)
supabase/
  schema.sql             Tables, triggers, account deletion cleanup
  policies.sql           Row Level Security, group RPCs, storage + realtime
  migrations/            Additive database upgrades
assets/                  Icons, splash, Play icon (generated)
docs/                    Privacy policy, terms, Play listing, release checklist
scripts/generate-assets.ps1   Regenerates all raster assets
```

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon key
npm run start             # or: npm run android
```

Apply the database:

1. Open the Supabase SQL editor and run `supabase/schema.sql`.
2. Then run `supabase/policies.sql`.

The schema script also creates profile rows for existing email users; it is safe
to run again if accounts were created before the database was set up.

For an existing database, apply `supabase/migrations/20261019000000_groups.sql`
in the Supabase SQL editor. For a fresh database, run the updated `schema.sql`
and then `policies.sql` as above. Group amounts are stored as integer paise. A
settlement entry records a payment made outside the app; it does not move money.

## Authentication setup

Email + password works as soon as Supabase is configured. Google sign-in uses
Supabase OAuth with `expo-auth-session` and `expo-web-browser`; the redirect URL
is derived from the `expensecounter` scheme in `app.config.ts`.

### Google sign-in

1. In **Google Cloud Console → APIs & Services → Credentials**, create an OAuth
   client ID of type **Web application**. Add
   `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect
   URI.
2. In **Supabase → Authentication → Providers → Google**, enable the provider and
   paste the Client ID and Client Secret from step 1.
3. In **Supabase → Authentication → URL Configuration**, set the Site URL and add
   these redirect URLs:
   - `expensecounter://auth-callback` (development, preview and production builds)
   - `expensecounter://*` (optional, for future deep links)
   - `http://localhost:8081/auth-callback` (only if you test OAuth on web)
4. Rebuild the dev client after changing `app.config.ts`:
   `npx expo run:android` (a Metro reload alone is not enough for native config).

### Password reset

The "Forgot password?" screen calls
`supabase.auth.resetPasswordForEmail(email)`. Reset emails use the Site URL from
Supabase → Authentication → URL Configuration, so make sure that URL is reachable
and matches the environment you are testing.

## Building for release

See `docs/release-checklist.md` for the full walkthrough. In short:

```bash
eas build --profile preview    --platform android   # internal APK
eas build --profile production --platform android   # store AAB
eas submit --profile production --platform android
```

## Documentation

| Document | Purpose |
| --- | --- |
| `docs/privacy-policy.md` | Public privacy policy (host at the URL in `app.config.ts`). |
| `docs/terms-of-service.md` | Public terms of service. |
| `docs/play-store-listing.md` | Store text + Data Safety answer sheet. |
| `docs/release-checklist.md` | Signing keys, testing tracks, closed testing, production access. |
# Expense-Tracker-App
