# Expense Counter — Android & iOS release checklist

Publisher: **Tushar** · Package / bundle id: `com.tushar.expensecounter`
Targets: Google Play (Android) and the Apple App Store (iOS). EAS handles
builds, signing and submission on both platforms.

Work top to bottom. Each section is independently verifiable. Sections 1–10 are
Android/Play-specific; sections 11–17 cover iOS and the App Store.

Work top to bottom. Each section is independently verifiable.

---

## 0. Prerequisites

- [ ] Node.js 20.18.0 (matches `eas.json` `build.base.node`) and npm installed.
- [ ] `npm install -g eas-cli` and log in: `eas login`.
- [ ] A **Google Play Developer account** (one-time $25 fee) at
      https://play.google.com/console.
- [ ] An **Apple Developer Program** membership ($99/year) at
      https://developer.apple.com/programs/ (required for TestFlight and the
      App Store).
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

- [ ] Deploy the message push function after applying the
      `20261026100000_message_push_notifications.sql` migration:

  ```bash
  supabase functions deploy send-message-request-push
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

| Profile | Android output | iOS output | Distribution | Variant id |
| --- | --- | --- | --- | --- |
| `development` | APK (dev client) | dev client | internal | `com.tushar.expensecounter.dev` |
| `preview` | APK | ad hoc / internal | internal (sharable link) | `com.tushar.expensecounter.preview` |
| `production` | AAB | App Store archive | store | `com.tushar.expensecounter` |

Each build gets its own application id / bundle id, so dev, preview and
production builds install side by side on one device. The URL scheme is also
per variant (`expensecounter-dev`, `expensecounter-preview`,
`expensecounter`).

### Build commands

```bash
# Installable dev-client APK for day-to-day development
eas build --profile development --platform android

# Internal APK to hand to testers (no Play account needed)
eas build --profile preview --platform android

# Production AAB for the Play Store (versionCode auto-increments)
eas build --profile production --platform android

# iOS dev client, internal build and App Store archive
eas build --profile development --platform ios
eas build --profile preview     --platform ios
eas build --profile production  --platform ios
```

### Submit commands

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
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
- [ ] iOS-only: on both sign-in and sign-up, **Sign in with Apple** appears above
      **Continue with Google**. On Android and web the Apple button is absent.
- [ ] iOS-only: sign in with Apple creates/returns a Supabase session, the Terms
      gate appears for a new account, and the native button uses the official
      Apple style.
- [ ] iOS-only: a physical device receives a chat push after granting
      notifications (APNs configured in section 13).
- [ ] iOS-only: Info.plist permission prompts read the copy from
      `app.config.ts` (camera, Face ID, photo library).

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

## 9. iOS prerequisites — Apple Developer & App Store Connect

- [ ] Enrol in the **Apple Developer Program** ($99/year) with the Apple ID that
      will own the app. Note the **Team ID** (Membership details).
- [ ] Accept the latest agreements in **App Store Connect → Business** and
      complete tax/banking if you ever add paid features (not required for a
      free app).
- [ ] Register an **App ID** for each bundle id, or let EAS create them during
      the first build:
      `com.tushar.expensecounter` (production),
      `com.tushar.expensecounter.preview`,
      `com.tushar.expensecounter.dev`.
      Enable **Sign In with Apple** and **Push Notifications** on each.
- [ ] Create the **App Store Connect app record**:
      My Apps → **+** → New App.
      - Platform: iOS
      - Name: `Expense Counter`
      - Primary language: English (U.K.)
      - Bundle ID: `com.tushar.expensecounter`
      - SKU: `expense-counter-ios`
      - User access: full access for the owner
- [ ] Note the numeric **Apple ID** of the app record (App Information →
      General Information); `eas submit` needs it.
- [ ] Create a **Services ID** for the Supabase Apple provider and a
      **Sign in with Apple key** (`.p8`), then note the Key ID. Keep the `.p8`
      file in a password manager — Apple only lets you download it once.

`eas.json` uses `appVersionSource: "remote"`. The production profile has
`autoIncrement: true`, so the iOS build number is incremented by EAS; do not
hand-edit it.

---

## 10. Sign in with Apple — Supabase setup

The app shows Apple's native button above Google on iOS only. It requests the
`FULL_NAME` and `EMAIL` scopes, hashes a nonce, and calls
`supabase.auth.signInWithIdToken({ provider: 'apple' })`.

- [ ] Authentication → Providers → **Apple** → enable.
- [ ] Fill in:
      - **Services ID** — the identifier from section 9
      - **Team ID** — Apple Developer membership
      - **Key ID** — the Sign in with Apple key
      - **Private key** — the full `.p8` contents
- [ ] Add every native bundle id to the provider's **Authorized Client IDs /
      Client IDs** list:
      `com.tushar.expensecounter`,
      `com.tushar.expensecounter.preview`,
      `com.tushar.expensecounter.dev`.
- [ ] Services ID return URL (web OAuth only):
      `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] Confirm `ios.usesAppleSignIn: true` and the
      `expo-apple-authentication` plugin are present in `app.config.ts`; this
      adds the `com.apple.developer.applesignin` entitlement.
- [ ] On a device, verify the button is absent on Android/web, present on iOS,
      and that a first-time Apple sign-in lands on the Accept Terms screen.
- [ ] Verify an Apple sign-in on a second device with an existing account does
      not ask for a name and still restores the session.

> App Store guideline 4.8: because Google sign-in is offered, the Apple option
> must be at least as prominent. The Apple button is rendered first on iOS.

---

## 11. APNs push credentials managed by EAS

Notifications already use Expo push (`expo-notifications`); Expo forwards to
APNs for iOS and FCM for Android. The APNs key lives in EAS — never in `.env`
or the repo.

- [ ] Log in and open iOS credentials:

  ```bash
  eas login
  eas credentials -p ios
  ```

- [ ] Select the production bundle id `com.tushar.expensecounter`.
- [ ] Choose **Push Notifications** → **Set up a new key** (EAS generates and
      stores an APNs key) or **Upload a .p8 key** from section 9.
- [ ] If uploading, enter the **Key ID** and **Team ID** when prompted.
- [ ] Repeat for `com.tushar.expensecounter.preview` and `.dev` if EAS asks;
      one APNs key is team-wide, so the same key can be selected/uploaded for
      each app id.
- [ ] Confirm the key in **expo.dev → Project → Credentials → iOS →
      Push Notifications**, and that the build gets the `aps-environment`
      entitlement from `expo-notifications` when EAS syncs capabilities.
- [ ] After installing a build, allow notifications, sign in, and send a chat
      message from a second account. Confirm the push arrives and
      `profiles.push_token` is populated.
- [ ] To rotate/revoke later: Apple Developer → Keys → revoke, then repeat
      `eas credentials -p ios` → Push Notifications → upload the new `.p8`.

---

## 12. iOS build & TestFlight

No build is started by this document. When you are ready:

```bash
# Optional: development client for a simulator/device
eas build --profile development --platform ios

# Internal build (preview bundle id) for testers
eas build --profile preview --platform ios

# App Store archive (production bundle id)
eas build --profile production --platform ios
```

- [ ] On the first iOS build EAS prompts for the Apple ID. Let EAS generate the
      **distribution certificate** and **provisioning profile** and sync the
      Sign In with Apple / Push capabilities.
- [ ] Confirm the build succeeds for the production bundle id and that
      `ITSAppUsesNonExemptEncryption: false` is in the exported Info.plist.
- [ ] Upload to App Store Connect:

  ```bash
  eas submit --profile production --platform ios
  # first run prompts for Apple ID, app Apple ID and Team ID
  # or: eas submit -p ios --apple-id <email> --asc-app-id <numeric-id> --apple-team-id <team>
  ```

- [ ] In App Store Connect → **TestFlight**:
  - [ ] Wait for processing (usually 5–30 minutes).
  - [ ] Answer **Export Compliance** (already declared non-exempt encryption =
        false; confirm the prompt).
  - [ ] Add yourself and internal testers under **Internal Testing** (up to 100
        App Store Connect users; no Beta App Review).
  - [ ] For external testing, create a group, add testers by email or public
        link, and submit the build for **Beta App Review**. Include the demo
        account in **Test Information**.
  - [ ] Fill **What to Test** (expenses, receipts, groups, chat, report/block,
        Apple sign-in, push, delete account).
  - [ ] Install via the TestFlight app and repeat the section 5 smoke test on
        iOS. TestFlight builds expire after 90 days.

---

## 13. App Store Connect listing

Use the text in `docs/play-store-listing.md` as the source; iOS needs a few
extra fields.

- [ ] **App Information**
  - [ ] Name: `Expense Counter`
  - [ ] Subtitle (max 30 chars): `Split expenses. Keep friendships.`
  - [ ] Category: **Finance**; secondary category: Productivity (optional)
  - [ ] Content rights: does not contain third-party content
  - [ ] Age rating questionnaire: user-generated content and messaging **Yes**;
        no violence, sexual content, gambling, drugs or ads. Expect **12+** or
        **17+** depending on the questionnaire's UGC answers.
  - [ ] Price: Free (no in-app purchases)
- [ ] **App Privacy** — see section 14.
- [ ] **Version information**
  - [ ] Description (adapt the Play full description, max 4000 chars)
  - [ ] Keywords (max 100 chars):
        `expense tracker,budget,split bills,shared expenses,chat,receipts`
  - [ ] Support URL: `https://tushar.github.io/expense-counter`
  - [ ] Marketing URL: optional
  - [ ] Privacy Policy URL:
        `https://tushar.github.io/expense-counter/privacy-policy`
- [ ] **Screenshots**
  - [ ] iPhone 6.9" (e.g. 1320 × 2868) — required; 2–10 images.
  - [ ] iPhone 6.5" (1242 × 2688) — recommended for older devices.
  - [ ] iPad screenshots are not required (`supportsTablet: false`).
  - [ ] Show expenses, group split, settle-up, chat, Settings/Delete account.
- [ ] **App icon**: 1024 × 1024 PNG, no transparency, no rounded corners
      (App Store Connect applies the mask).
- [ ] **Sign In with Apple** capability is present in the build (section 10).
- [ ] Select the processed TestFlight build, add the review contact, and submit
      for review. Choose manual release or automatic after approval.

---

## 14. App Privacy (nutrition labels) from the Data Safety answers

The existing data map is in `docs/play-store-listing.md` §5. Translate it into
Apple's **App Privacy** questionnaire as follows. All data is linked to the
user, is **not** used for tracking, and is used for **App Functionality**.

| Apple data type | Collected | Linked to user | Tracking | Purpose | Source of truth |
| --- | --- | --- | --- | --- | --- |
| Contact Info → **Name** | Yes | Yes | No | App Functionality | Sign-up profile |
| Contact Info → **Email Address** | Yes | Yes | No | App Functionality | Supabase auth |
| Financial Info → **Other Financial Info** | Yes | Yes | No | App Functionality | Expenses, splits, settlements, optional UPI ID |
| User Content → **Other User Content** | Yes | Yes | No | App Functionality | Chat messages |
| User Content → **Photos or Videos** | Yes | Yes | No | App Functionality | Optional receipt photos |
| Identifiers → **Device ID** | Yes | Yes | No | App Functionality | Expo push token |

- [ ] **Data Used to Track You**: none.
- [ ] **Data Linked to You**: the six rows above.
- [ ] **Data Not Linked to You**: none.
- [ ] **Data Not Collected** (leave unchecked): precise/coarse location,
      contacts, calendar, health/fitness, search history, browsing history,
      purchase history, usage data, diagnostics, crash data, advertising data.
      The app has no analytics SDK and no ads.
- [ ] Answer **"Do you or your third-party partners use data for tracking?"** →
      **No**. Apple's ATT prompt is therefore not required.
- [ ] Data deletion: in-app **Settings → Delete account** plus the public
      deletion URL. Privacy Policy URL as in section 13.
- [ ] The app-level privacy manifest lives under `ios.privacyManifests` in
      `app.config.ts` (UserDefaults, file timestamp, disk space, system boot
      time reasons; collected data types mirrored from this table). Expo and
      React Native libraries contribute their own `PrivacyInfo.xcprivacy`
      manifests during prebuild.
- [ ] Re-check these answers whenever a data type or SDK is added.

---

## 15. App Review notes & demo account

App Review needs a working account because the entire app is behind sign-in.

- [ ] Create a demo account **before submitting** and populate it with:
      - 3–4 personal expenses, one with a receipt photo
      - one group with a second demo member, a shared expense and a settle-up
      - one accepted conversation with 2–3 messages and one pending request
- [ ] Demo credentials (same as the Play reviewer account):

  | Field | Value |
  | --- | --- |
  | Email | `play.reviewer+expensecounter@gmail.com` |
  | Password | *(set a real password in Supabase and store it in the review notes; never commit it)* |

- [ ] App Store Connect → App Review Information → **Sign-In required: Yes**,
      and paste the email/password.
- [ ] **Notes for Review** (adapt as needed):

  > Expense Counter is a private expense tracker with optional shared groups and
  > 1:1 chat. Sign in with the demo account above. A new account can be created
  > with any email, or on iOS with Sign in with Apple (the Apple button is shown
  > on iOS only).
  >
  > To try the main flow: add an expense from the + button, optionally attach a
  > receipt photo, open Groups → "Weekend trip" to see split balances and
  > settle-up, and open Chat to see a conversation. Messages can be reported or
  > users blocked from the conversation menu.
  >
  > Settings → Delete account permanently removes the account, expenses,
  > messages, push token and local cache. Privacy Policy and Terms are available
  > in Settings and at the URLs in the listing. The app has no ads, no in-app
  > purchases, and does not connect to bank accounts. UPI IDs are optional
  > payment handles shown only to group members.
- [ ] Add a contact name, phone and email for App Review.
- [ ] If you use **external TestFlight**, put the same demo account in
      TestFlight → Test Information so the Beta App Review can sign in.

---

## 16. Post-release maintenance

- [ ] Keep the EAS keystore backup safe (section 3) and the APNs key owner
      documented (section 11).
- [ ] Re-run `supabase/policies.sql` any time tables change, and add RLS for new
      tables.
- [ ] For every update: bump `version`, run
      `eas build --profile production --platform android` and
      `eas build --profile production --platform ios`, then submit both.
- [ ] Target the API level Google currently requires (Play Console warns when you
      fall behind).
- [ ] Re-check the Data Safety form and the App Privacy nutrition labels whenever
      you add a new data type or SDK.
- [ ] Rotate the APNs key and Android FCM key if they are ever exposed.

---

## 17. Quick command reference

```bash
# One-time
npm install
eas login
eas init
eas build:configure

# Signing / push credentials
eas credentials --platform android          # generate / download / upload keystore
eas credentials --platform ios              # distribution cert, provisioning, APNs key

# Builds
eas build --profile development --platform android   # dev-client APK
eas build --profile preview     --platform android   # internal tester APK
eas build --profile production  --platform android   # store AAB
eas build --profile development --platform ios       # iOS dev client
eas build --profile preview     --platform ios       # internal TestFlight build
eas build --profile production  --platform ios       # App Store archive

# Submit
eas submit --profile production --platform android
eas submit --profile production --platform ios

# Quality gates
npm run typecheck
npm run lint
npm test
```
