# Expense Counter — Google Play Store listing

Package: `com.tushar.expensecounter`
Developer / publisher name: **Tushar**
Category: **Finance**
Tags: budgeting, expense tracker, personal finance, chat
Content rating target: **Everyone** (no ads, no user-generated content surfaced publicly)

---

## 1. App title (max 30 characters)

```
Expense Counter
```

*(14 characters — well within the 30-character limit.)*

---

## 2. Short description (max 80 characters)

```
Track expenses with receipt photos and chat privately. Simple and secure.
```

*(73 characters.)*

### Alternative short descriptions (all ≤ 80 characters)

```
Log daily expenses, attach receipts, chat privately. Free and ad-free.
```
*(69 characters.)*

```
Private expense tracker with receipt photos, biometric lock and secure chat.
```
*(76 characters.)*

---

## 3. Full description (max 4000 characters)

```
Expense Counter is a clean, private way to keep track of what you spend — and to
talk about it with the people you split costs with.

Add an expense in seconds, attach a photo of the receipt, and let the app do the
totals. No ads, no clutter, and no selling your data.

WHY PEOPLE USE EXPENSE COUNTER

• Fast expense entry — record an amount, pick a category, add an optional note.
• Receipt photos — snap a picture or attach one from your gallery.
• Clear totals — see your running total at a glance and stay in control of your
  spending.
• Works offline — your expenses are cached on the device, so you can keep
  tracking even without a connection.
• Private by design — your expenses are yours alone. Row Level Security on the
  server means nobody else can read them.

BUILT-IN PRIVATE CHAT

Discuss a shared bill right where your budget lives. Expense Counter includes
one-to-one messaging so you can coordinate without leaving the app.

• Simple one-to-one conversations.
• Report any message or user in a couple of taps.
• Block anyone instantly — when either of you blocks, messages between you are
  hidden in both directions.
• Your reports are confidential and reviewed by the developer.

SECURE AND IN CONTROL

• Optional biometric app lock (Face ID / fingerprint / device passcode).
• Your session is kept in your device's secure storage.
• Notifications you can turn off at any time.

DELETE YOUR DATA, ANY TIME

You are in charge of your data. From Settings you can delete your account, which
permanently removes your profile, all of your expenses, your messages and your
push token, and wipes the app's local database on your device.

WHAT EXPENSE COUNTER IS NOT

• It is not a bank and it does not connect to your bank accounts.
• It does not provide financial advice.
• It does not show ads and does not track you across other apps.

Expense Counter is a personal record-keeping tool. Enter what you spend, keep the
receipts, and keep your information private.

Made with care by Tushar.
```

*(~1,750 characters — within the 4000-character limit.)*

---

## 4. Graphics checklist (uploaded to Play Console, not text)

| Asset | Requirement | File |
| --- | --- | --- |
| App icon | 512 × 512 px, 32-bit PNG, no alpha | `assets/play-store-icon.png` |
| Feature graphic | 1024 × 500 px, PNG/JPEG | create and upload |
| Phone screenshots | 2–8 images, min 320 px, 16:9 or 9:16 | capture from a device |
| 7" / 10" tablet screenshots | optional | — |
| Promo video | optional | — |

---

## 5. Data Safety form — answer sheet

Fill the Play Console "Data safety" questionnaire with the answers below. These
match the app's actual behaviour as implemented in `supabase/schema.sql`,
`src/lib/notifications.ts`, and the Delete Account flow.

### 5.1 Overview answers

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** — collects data |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data be deleted? | **Yes** |
| Does your app collect or share any data types from the Families policy? | **No** |
| Has your app been independently validated against a security standard (MASA)? | **No** |
| Does your app contain ads? | **No** |
| Is account creation required to use the app? | **Yes** — an account is required |

### 5.2 Data types collected

For every row: **Shared = No.** Data is processed only by our service providers
(Supabase, Expo, Google FCM) on our behalf and is never sold or used for
advertising.

| Data type (Play category) | Collected | Optional for the user | Purposes | Linked to identity |
| --- | --- | --- | --- | --- |
| Personal info → **Name** | Yes | No (required at sign-up) | App functionality, Account management | Yes |
| Personal info → **Email address** | Yes | No (required at sign-up) | App functionality, Account management | Yes |
| Financial info → **Other financial info** (expense amounts & categories) | Yes | Yes (users may use the app without recording expenses) | App functionality | Yes |
| Messages → **Other in-app messages** (chat content) | Yes | Yes (only if the user chats) | App functionality | Yes |
| Photos and videos → **Photos** (receipt images) | Yes | Yes (only if the user attaches a receipt) | App functionality | Yes |
| Device or other IDs → **Device or other IDs** (push token) | Yes | Yes (only if notifications are allowed) | App functionality | Yes |

### 5.3 Data types NOT collected (leave unchecked)

Location (approximate/precise) · Contacts · Calendar · Health & fitness ·
SMS or MMS · Emails (outside the sign-in address) · Audio · Files & docs ·
Web browsing history · App interaction / in-app search history · Installed apps ·
Crash logs · Diagnostics · Performance data · Advertising / device advertising ID

> Receipt images are stored as photos, so the **Photos** data type is used; the
> "Files and docs" type does **not** apply.

### 5.4 Data usage & handling detail

| Question | Answer |
| --- | --- |
| Is the data ephemeral (processed only in memory, not stored)? | No — data is stored |
| Is the data collected for advertising or marketing? | No |
| Is the data used to personalise content? | No |
| Is the data transferred to third parties? | No (only service providers acting on our behalf) |
| Is data deleted when the user deletes their account? | Yes — profile, expenses, messages, push token and local cache are erased |
| Deletion request mechanism | In-app: Settings → Delete account. External: tushar.expensecounter@gmail.com |
| Data retention period | Until the user deletes the item or their account |

### 5.5 Security practices to declare

| Question | Answer |
| --- | --- |
| Data encrypted in transit | **Yes** (TLS to Supabase, Expo and FCM) |
| Data encrypted at rest | Yes (managed by the hosting provider) |
| Sign-in / account authentication supported | Yes (email + password via Supabase Auth) |
| Users can request deletion without leaving the app | Yes |
| Committed to follow the Play Families policy | Not applicable (app is not directed at children) |

---

## 6. "App access" form answers

Because a login is required, Play reviewers need test credentials.

| Field | Value |
| --- | --- |
| Is any part of the app restricted? | Yes — the whole app requires sign-in |
| Instructions | "Create an account with any email on the sign-in screen, or use the demo account below." |
| Demo email | `play.reviewer+expensecounter@gmail.com` |
| Demo password | *(set a real password on the demo account before submitting)* |

> Create the demo account in advance and populate it with a few expenses and one
> conversation so reviewers can see every feature.

---

## 7. Other console declarations

| Declaration | Answer |
| --- | --- |
| Ads | App does not contain ads |
| In-app purchases | None |
| Target audience | 13+ / "Not designed for children" |
| Content rating questionnaire | No violence, no sexual content, no language, no controlled substances; user-to-user communication **Yes**; users can share location **No**; personal info sharing **Yes** |
| News app | No |
| COVID-19 contact tracing | No |
| Data deletion URL | https://tushar.github.io/expense-counter/privacy-policy (policy includes deletion steps) |
| Privacy policy URL | https://tushar.github.io/expense-counter/privacy-policy |
