# Expense Counter — Google Play release checklist

Publisher: **Tushar** · Package: `com.tushar.expensecounter`
Target: Google Play (Android). EAS handles builds, signing and submission.

Work top to bottom. Each section is independently verifiable.

---

## 0. Prerequisites

- [ ] Node.js 20.18.0 (matches `eas.json` `build.base.node`) and npm installed.
- [ ] `npm install -g eas-cli` and log in: `eas login`.
- [ ] A **Google Play Developer account** (one-time $25 fee) at
      https://play.google.com/console.
- [ ] A **Supabase** project with `EXPO_PUBLIC_SUPABASE_URL` / anon key noted.
- [ ] The repo published to GitHub (or another Git remote) so EAS can build from
      source; `git init` if needed.
- [ ] Install dependencies locally: `npm install`.

---

## 1. Project setup with EAS

- [ ] Initialise the EAS project (writes `extra.eas.projectId`):

  ```bash
  eas init
  ```

- [ ] Confirm `eas.json` is present (it is) and link build profiles:

  ```bash
  eas build:configure
  ```

  The three profiles are already defined and must not be renamed:
  `development`, `preview`, `production`.

---

## 2. Secrets and environment

Client-visible values live in `.env` (never committed — see `.gitignore`):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://tushar.github.io/expense-counter/privacy-policy
EXPO_PUBLIC_TERMS_URL=https://tushar.github.io/expense-counter/terms
EXPO_PUBLIC_ACCOUNT_DELETION_URL=https://tushar.github.io/expense-counter/account-deletion
```

- [ ] Create the Supabase project and run, in the SQL editor, **in order**:
  1. `supabase/schema.sql`
  2. `supabase/policies.sql`
- [ ] For an existing database, check its migration history and apply each
      missing migration in timestamp order. Do not re-run migrations already
      applied:
  1. `20261019000000_groups.sql`
  2. `20261020000000_group_split_modes.sql`
  3. `20261020100000_group_profile_columns.sql`
  4. `20261020200000_chat_requests.sql`
  5. `20261020300000_group_expense_edits.sql`
  6. `20261020400000_play_security_baseline.sql`
- [ ] Verify the `receipts` storage bucket exists and is **private**.
- [ ] Publish `docs/account-deletion.md` on the public GitHub Pages site and
      verify its URL while signed out:
      `https://tushar.github.io/expense-counter/account-deletion`.
- [ ] Assign an owner to review abuse reports in Supabase; see
      `docs/moderation-runbook.md`. There is no in-app moderation queue or
      automatic review.
- [ ] Confirm Realtime is enabled for `public.messages`
      (Database → Replication → `supabase_realtime`).
- [ ] Add build-time secrets to EAS if you prefer not to commit them:

  ```bash
  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://<ref>.supabase.co" --environment production
  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --environment production
  ```

- [ ] Configure **FCM v1** credentials so Android push works:

  ```bash
  eas credentials --platform android
  # select: Push Notifications (FCM) -> upload the Google service account key
  ```

  Create the service account key in Firebase (Project settings → Service
  accounts → Generate new private key) and upload it when prompted.

> The Supabase **service-role** key must never appear in the app or in `.env`.
> Only the anon key ships to clients; RLS enforces access.

---

## 3. Signing keys via EAS

EAS manages the Android keystore for you. Do this **once**, before the first
production build, and keep a backup.

- [ ] Generate / inspect credentials:

  ```bash
  eas credentials --platform android
  ```

  Choose **Build credentials → Generate a new Android Keystore** when prompted.
  EAS stores the keystore on its servers.

- [ ] **Back up the keystore** (required to ever update the app again):

  ```bash
  eas credentials --platform android
  # select: Download existing keystore
  ```

  Store the downloaded `.jks` and its passwords in a password manager. Losing
  the keystore means you can never update the app on Play under the same listing
  (unless Play App Signing key reset is approved).

- [ ] Note the **SHA-1 / SHA-256** fingerprints printed by `eas credentials`.
  If you later add Google Sign-In or Firebase, these are required.

- [ ] Optional: upload your own keystore with
      `eas credentials --platform android` → **Upload**.

- [ ] Confirm Play App Signing is enabled in Play Console
      (Release → Setup → App integrity). Google re-signs the AAB with the app
      signing key; EAS's key becomes the upload key.

---

## 4. Build profiles (already defined in `eas.json`)

| Profile | Output | Distribution | Variant id |
| --- | --- | --- | --- |
| `development` | APK (dev client) | internal | `com.tushar.expensecounter.dev` |
| `preview` | APK | internal (sharable link) | `com.tushar.expensecounter.preview` |
| `production` | AAB | store | `com.tushar.expensecounter` |

Each build gets its own Android application id, so dev, preview and production
builds install side by side on one device.

### Build commands

```bash
# Installable dev-client APK for day-to-day development
eas build --profile development --platform android

# Internal APK to hand to testers (no Play account needed)
eas build --profile preview --platform android

# Production AAB for the Play Store (versionCode auto-increments)
eas build --profile production --platform android
```

### Submit command

```bash
eas submit --profile production --platform android
```

`eas.json` submits to the **internal** track as a **draft** by default. Change
`submit.production.android.track` to `alpha`, `beta`, or `production` when you
are ready to advance (see section 6).

---

## 5. Local verification before any store build

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Smoke-test the preview APK on a physical device:
  - [ ] Sign up / sign in works.
  - [ ] Add an expense; attach a receipt from camera and gallery.
  - [ ] Create a group, join it from a second account using the invite code, and
        confirm non-members cannot read the group's ledger.
  - [ ] Add a shared expense with an uneven paise remainder; confirm all shares
        total exactly to the expense amount and balances remain in whole paise.
  - [ ] Record a suggested settle-up payment and confirm the balances update.
  - [ ] Set a UPI ID and confirm it is visible only to the account owner and
        members of that group.
  - [ ] Offline: expenses still load from the local SQLite cache.
  - [ ] Send a chat message between two accounts; it arrives live.
  - [ ] Report a message; row appears in `public.reports`.
  - [ ] Block a user; messages disappear in both directions; `public.blocks`
        has the row.
  - [ ] Toggle the biometric app lock; background + reopen prompts unlock.
  - [ ] Grant and deny notification permission; push token appears/does not
        appear on the profile.
  - [ ] **Settings → Delete account**: profile, personal expenses, group entries
        involving the account, messages and push token are handled in Supabase,
        local data is wiped, and you are signed out.
  - [ ] Privacy Policy and Terms links open in Settings.
- [ ] Check that ONLY these Android permissions are requested:
      `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `CAMERA`.
      Inspect the built APK with `aapt dump permissions app.apk` (or Play
      Console → App content → Permissions).

---

## 6. Testing tracks

Google Play tracks, from least to most visible:

1. **Internal testing** — up to 100 testers, available within minutes, no review.
2. **Closed testing (alpha)** — invite-only; required before production for
   personal developer accounts (see section 7).
3. **Open testing (beta)** — public opt-in, still pre-release.
4. **Production** — full release.

### 6.1 Internal testing (first stop)

- [ ] Upload the first AAB to **internal**:

  ```bash
  eas submit --profile production --platform android
  ```

- [ ] In Play Console → Testing → Internal testing → **Testers**: create an email
      list and add your own Google account.
- [ ] Share the opt-in link with testers; install via Play.
- [ ] Complete the required Play Console setup tasks that appear on the
      Dashboard (App content, Data safety, Content rating, Target audience,
      Store listing, App access) — these gate all testing tracks.

### 6.2 Closed testing (alpha)

- [ ] Testing → Closed testing → **Create track** (e.g. "Closed 1.0").
- [ ] Add testers by **email list** or **Google Group**.
- [ ] Promote the internal build to the closed track, or submit a new build with
      `track: "alpha"`:

  ```bash
  eas submit --profile production --platform android
  # after editing submit.production.android.track to "alpha"
  ```

- [ ] Share the closed-testing opt-in URL with every tester.

---

## 7. Closed testing setup & production access request

> **Important:** New *personal* Google Play developer accounts (created after
> Nov 13, 2023) must run a closed test with **at least 12 testers who opted in
> for 14 continuous days** before they can apply for production access.
> Organisation accounts are exempt.

- [ ] Create the closed testing track (section 6.2).
- [ ] Recruit **12+ testers** (more than 12 recommended, in case some drop off).
- [ ] Have each tester **install from the Play opt-in link** and keep the app
      installed — the 14 days must be **continuous** per tester.
- [ ] Ask testers to actually use the app (record expenses, send a message,
      try a report/block) so the test is meaningful.
- [ ] Keep a spreadsheet of tester emails + the date each opted in.
- [ ] After **14 consecutive days with ≥12 opted-in testers**:
  - [ ] Play Console → Dashboard shows an **"Apply for production access"**
        button (or Testing → Closed testing → Apply).
  - [ ] Fill the application form: how you recruited testers, the feedback you
        received, and what you changed. Be specific.
  - [ ] Submit and wait for Google's review (typically a few days).

---

## 8. Production release

- [ ] Ensure the closed test window is satisfied and production access is granted.
- [ ] Bump `version` in `app.config.ts` for a user-visible release
      (e.g. `1.0.0` → `1.1.0`). `versionCode` auto-increments in the production
      profile, so do not edit it manually.
- [ ] Build the production AAB:

  ```bash
  eas build --profile production --platform android
  ```

- [ ] Submit it (switch the track to `production` in `eas.json` first, or use the
      Console UI):

  ```bash
  eas submit --profile production --platform android
  ```

- [ ] In Play Console, complete **Store listing** using
      `docs/play-store-listing.md`:
  - [ ] Title, short description, full description.
  - [ ] App icon 512×512 (`assets/play-store-icon.png`).
  - [ ] Feature graphic 1024×500.
  - [ ] At least 2 phone screenshots.
  - [ ] Privacy policy URL:
        https://tushar.github.io/expense-counter/privacy-policy
- [ ] File the **Data safety** form using the answer sheet in
      `docs/play-store-listing.md` §5.
- [ ] Complete the **Financial features** declaration accurately for expense
      tracking and shared balances.
- [ ] Confirm the final Android App Bundle targets API level 36 or newer.
      Expo [SDK 58's Android support table](https://docs.expo.dev/versions/v58.0.0/)
      lists target SDK 36; still verify the produced bundle in Play Console.
- [ ] Complete **Content rating**, **Target audience**, **App access**
      (reviewer demo credentials), **Ads** and **News** declarations.
- [ ] Roll out to production (start with a **staged rollout** such as 20%).
- [ ] Monitor Android vitals and crash reports for the first 48 hours.

---

## 9. Post-release maintenance

- [ ] Keep the EAS keystore backup safe (section 3).
- [ ] Re-run `supabase/policies.sql` any time tables change, and add RLS for new
      tables.
- [ ] For every update: bump `version`, run
      `eas build --profile production --platform android`, then
      `eas submit --profile production --platform android`.
- [ ] Target the API level Google currently requires (Play Console warns when you
      fall behind).
- [ ] Re-check the Data Safety form whenever you add a new data type.

---

## 10. Quick command reference

```bash
# One-time
npm install
eas login
eas init
eas build:configure

# Signing
eas credentials --platform android          # generate / download / upload keystore

# Builds
eas build --profile development --platform android   # dev-client APK
eas build --profile preview     --platform android   # internal tester APK
eas build --profile production  --platform android   # store AAB

# Submit
eas submit --profile production --platform android

# Quality gates
npm run typecheck
npm run lint
```
