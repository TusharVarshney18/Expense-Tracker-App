# Expense Counter

A private expense tracker with receipt photos and 1:1 chat, built with Expo
(React Native), Supabase and SQLite. Made by **Tushar**.

- Package: `com.tushar.expensecounter`
- Bundle ID: `com.tushar.expensecounter` (per-variant `.dev` / `.preview` suffixes)
- Version: 1.0.0
- Platforms: Android (Google Play) and iOS (App Store / TestFlight).

## Features

- Expense tracking with categories, notes and optional receipt photos.
- Shared groups with invite codes, equal expense splits, balances and settle-up records.
- Offline-first: expenses are cached in local SQLite on native and in
  AsyncStorage on web. (`expo-sqlite`'s web OPFS backend allows only one tab at
  a time, so web uses `src/lib/db.web.ts` instead.) Native writes share one
  connection and are serialised through a promise queue so overlapping
  refreshes cannot break a transaction.
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

For an existing database, apply every file in `supabase/migrations/` in filename
order in the Supabase SQL editor (the latest is
`20261026000000_terms_acceptance_gate.sql`). For a fresh database, run the
updated `schema.sql` and then `policies.sql` as above, followed by the Terms-gate
migration. Group amounts are stored as integer paise. A settlement entry records
a payment made outside the app; it does not move money.

## Authentication setup

- Email + password works as soon as Supabase is configured. Google sign-in uses
  Supabase OAuth with `expo-auth-session` and `expo-web-browser`. Sign in with
  Apple uses `expo-apple-authentication` and a Supabase ID token, and is shown
  on iOS only. The Google redirect URL is produced with `makeRedirectUri` from
  the URL scheme of the running build, so development, preview and production
  installs each return to their own app.

### Build variants and redirect schemes

`app.config.ts` derives both the application id and the URL scheme from
`APP_VARIANT` (set by each EAS profile in `eas.json`; it defaults to production):

| `APP_VARIANT` | App id | URL scheme | OAuth redirect |
| --- | --- | --- | --- |
| `development` | `com.tushar.expensecounter.dev` | `expensecounter-dev` | `expensecounter-dev://auth-callback` |
| `preview` | `com.tushar.expensecounter.preview` | `expensecounter-preview` | `expensecounter-preview://auth-callback` |
| `production` | `com.tushar.expensecounter` | `expensecounter` | `expensecounter://auth-callback` |

### Google sign-in

1. In **Google Cloud Console → APIs & Services → Credentials**, create an OAuth
   client ID of type **Web application**. Add
   `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect
   URI.
2. In **Supabase → Authentication → Providers → Google**, enable the provider and
   paste the Client ID and Client Secret from step 1.
3. In **Supabase → Authentication → URL Configuration**, set the Site URL and add
   exactly these redirect URLs:
   - `expensecounter-dev://auth-callback`
   - `expensecounter-preview://auth-callback`
   - `expensecounter://auth-callback`
   - `http://localhost:8081/auth-callback` (only if you test OAuth on web)
4. Rebuild the dev client after changing `app.config.ts`:
   `npx expo run:android` (a Metro reload alone is not enough for native config).

### Sign in with Apple (iOS only)

The iOS sign-in and sign-up screens render Apple's official button above the
Google button. It uses `expo-apple-authentication` to get an identity token and
exchanges it with Supabase via `signInWithIdToken`. Android and web never load
or show it.

**Apple Developer portal**

1. Join the Apple Developer Program and accept the latest agreements in
   App Store Connect.
2. Register an **App ID** for every bundle id you build:
   `com.tushar.expensecounter`, `com.tushar.expensecounter.preview`,
   `com.tushar.expensecounter.dev`. Enable the **Sign In with Apple** capability
   on each. EAS can also create/sync these when it provisions the app.
3. Create a **Services ID** (for example
   `com.tushar.expensecounter.web`) and enable Sign In with Apple for it.
   Configure its return URL as
   `https://<project-ref>.supabase.co/auth/v1/callback` and its domain as
   `<project-ref>.supabase.co`.
4. Create a **Key** with Sign In with Apple enabled, download the `.p8` file
   (only downloadable once), and note the **Key ID** and your **Team ID**.

**Supabase**

1. Authentication → Providers → **Apple**: enable the provider.
2. Paste the Services ID, Team ID, Key ID and the contents of the `.p8` key.
3. Under **Authorized Client IDs / Client IDs**, add the native bundle ids
   (`com.tushar.expensecounter`, `.preview`, `.dev`). Supabase checks the
   `aud` claim of the Apple identity token against this list.
4. Keep the URL Configuration entries from the Google section; Apple native
   sign-in does not use a redirect URL.

The `com.apple.developer.applesignin` entitlement is added by the
`expo-apple-authentication` config plugin, and `ios.usesAppleSignIn` is enabled
in `app.config.ts`. Build the iOS app with EAS (or `npx expo run:ios` with a
local Apple account) so the capability is provisioned. Apple only returns the
user's name on the first authorization; the app mirrors it into
`display_name` when present.

> App Store guideline 4.8 requires an equally prominent alternative login when
> a third-party login such as Google is offered. The Apple button is rendered
> above the Google button on iOS to satisfy this.

### Universal links / associated domains (optional)

`app.config.ts` adds `applinks:` and `webcredentials:` entries for the host in
`EXPO_PUBLIC_ASSOCIATED_DOMAIN` (or `EXPO_PUBLIC_SITE_URL`). This is not needed
for OAuth, which uses the variant URL scheme. Only set it if that host serves
`https://<host>/.well-known/apple-app-site-association`; GitHub Pages project
sites cannot serve that file at the domain root.

### Terms gate

After any sign-in (email or Google), the root route guard loads the user's
profile before showing Home. If `profiles.terms_accepted_at` is null or
`terms_version` is older than the current `TERMS_VERSION`, every protected route
redirects to **Accept Terms**; only the Terms and Privacy documents remain
reachable. OAuth deep-link returns are exchanged for a session first — including
a cold start from the link — and the guard waits on a splash screen until that
finishes.

The `20261026000000_terms_acceptance_gate.sql` migration also rejects inserts
into `personal_expenses`, `messages` and the group tables while the authenticated
user's `terms_accepted_at` is null. Run `supabase/rls_tests.sql` on staging to
verify both the RLS and Terms-gate cases.

### Push notifications

Message and message-request pushes are sent by the
`send-message-request-push` Edge Function (the name is kept for backwards
compatibility). After applying
`20261026100000_message_push_notifications.sql`, deploy the function:

```bash
supabase functions deploy send-message-request-push
```

The function uses the automatically provided `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets. Device tokens are
stored on `profiles.push_token`; Android delivery requires FCM v1 credentials
in EAS, and iOS delivery requires an APNs key in EAS (see
`docs/release-checklist.md`). Every accepted-chat reply and every first request
message now notifies the other participant.

Both platforms use Expo push (`expo-notifications` → Expo push service → FCM or
APNs). Upload the APNs credentials once with:

```bash
eas credentials -p ios
# select the bundle id → Push Notifications → Set up/upload the APNs key
```

EAS stores the key and injects the `aps-environment` entitlement during the
build, so no push secrets belong in `.env` or `app.config.ts`.

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

eas build --profile preview    --platform ios       # TestFlight / internal
eas build --profile production --platform ios       # App Store archive
eas submit --profile production --platform ios
```

iOS builds and submissions require an Apple Developer account; EAS creates the
distribution certificate, provisioning profile and APNs key on first use. See
the iOS sections of `docs/release-checklist.md`.

## Documentation

| Document | Purpose |
| --- | --- |
| `docs/privacy-policy.md` | Public privacy policy (host at the URL in `app.config.ts`). |
| `docs/terms-of-service.md` | Public terms of service. |
| `docs/play-store-listing.md` | Store text + Data Safety answer sheet. |
| `docs/release-checklist.md` | Signing keys, testing tracks, closed testing, production access. |
# Expense-Tracker-App
