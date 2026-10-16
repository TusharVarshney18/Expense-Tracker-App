# Privacy Policy for Expense Counter

**Last updated: October 17, 2026**

Expense Counter ("the app", "we", "us") is developed and published by Tushar
("the developer"). This Privacy Policy explains what personal data the app
collects, why we collect it, how it is stored, who it is shared with, and how
you can delete it.

By installing and using Expense Counter you agree to this Privacy Policy. If you
do not agree, please do not use the app.

**Contact:** tushar.expensecounter@gmail.com
**Published at:** https://tushar.github.io/expense-counter/privacy-policy

---

## 1. Summary

- We collect the minimum data needed to run the app: your account details, the
  expenses you record, the messages you send, and a device push token.
- We do **not** sell your data.
- We do **not** show ads and we do **not** use your data for advertising.
- We do **not** collect location, contacts, or health data.
- You can delete your entire account and all associated data from inside the
  app at any time (Settings → Delete account).

---

## 2. Data we collect

### 2.1 Account data
| Data | Example | Why |
| --- | --- | --- |
| Email address | you@example.com | Create and sign in to your account. |
| Display name | "Tushar" | Show your name to people you chat with. |
| Password | (stored only as a salted hash) | Authenticate you. We never see your password. |

Authentication is provided by Supabase. Passwords are hashed by Supabase Auth
and are never readable by the developer.

### 2.2 Expense data
| Data | Example | Why |
| --- | --- | --- |
| Amount | 450.00 | Record and total your expenses. |
| Category | "food" | Group your spending. |
| Note (optional) | "Team lunch" | Add context to an expense. |
| Date | 2026-10-17 | Order expenses chronologically. |
| Receipt photo (optional) | a JPEG image | Attach proof of purchase. |

### 2.3 Messages
| Data | Example | Why |
| --- | --- | --- |
| Message body | "Did you get the receipt?" | Deliver the in-app chat. |
| Sender / recipient IDs | user UUIDs | Route the message to the right person. |
| Timestamps & read status | ISO timestamps | Show when messages were sent and read. |

Message content is visible only to you and the person you are chatting with.

### 2.4 Push token
| Data | Example | Why |
| --- | --- | --- |
| Expo push token | ExponentPushToken[xxxx] | Deliver notifications for new messages and expense reminders. |

### 2.5 Report data
| Data | Example | Why |
| --- | --- | --- |
| Report reason | "harassment" | Let you report abuse and let us review it. |
| Report details (optional) | free text | Additional context for a report. |

### 2.6 Data we do NOT collect
Location, contacts, calendar, SMS/call logs, health data, browsing history,
advertising identifiers, or crash/analytics telemetry.

---

## 3. How we use your data

We use your data only to provide the app:

1. **Authentication** — to create and secure your account.
2. **Expense tracking** — to display, total and store the expenses you add.
3. **Chat** — to deliver messages between you and recipients.
4. **Notifications** — to alert you to new messages and reminders you opted into.
5. **Trust & safety** — to review reports of abuse and enforce our Terms.

We do not use your data for advertising, profiling, or any purpose other than
operating the app for you.

---

## 4. Legal basis

Where required by law we process your data on the basis of **performance of a
contract** (providing the app you signed up for). Optional features such as
receipt photos and notifications rely on your **consent**, which you can withdraw
at any time through your device settings or by simply not using the feature.

---

## 5. Storage and security

- Data is stored in a Supabase (PostgreSQL) database and Supabase Storage.
- All traffic between the app and the servers is encrypted in transit (TLS).
- Data is encrypted at rest by the hosting provider.
- Row Level Security is enabled on every table: expense rows are readable only
  by their owner, and messages only by their two participants. Messages between
  a blocked user and you are hidden in both directions.
- Your session is stored on-device in the platform secure storage (iOS Keychain
  / Android EncryptedSharedPreferences).
- Receipt photos are held in a private storage bucket; each user can access only
  their own folder.

No method of transmission or storage is 100% secure, but we take reasonable
measures to protect your data.

---

## 6. Sharing and third parties

We do not sell or rent your data. We share it only with the service providers
that operate the app on our behalf, and only as far as needed:

| Provider | Purpose | Data involved |
| --- | --- | --- |
| Supabase | Database, authentication, file storage | All app data |
| Expo | Push notification delivery | Push token, notification content |
| Google (Android) | OS-level push delivery (FCM) | Push token |

These providers are bound by their own privacy policies and act as processors.
We may also disclose data if required by law or to protect the rights and safety
of users.

---

## 7. Camera, photos and biometrics

- **Camera / Photos:** requested only when you choose to attach a receipt. Images
  are used solely for that receipt and are never captured in the background.
- **Biometrics:** the optional app lock uses Face ID / fingerprint / device
  passcode. Biometric data never leaves your device and is never sent to us.

---

## 8. Data retention

We keep your data for as long as your account exists. Individual expenses can be
deleted at any time; messages you send are removed together with your account.
When you delete your account, the data described in section 9 is erased
immediately.

---

## 9. Deleting your account and data

You can delete your account from inside the app:

**Settings → Delete account → confirm.**

Deleting your account permanently removes:

- your profile (email, display name, avatar);
- all of your personal expenses and their receipt images;
- all messages you have sent;
- your push token;
- the local database stored on your device.

After deletion you are signed out and the data cannot be recovered. If you
cannot access the app, email tushar.expensecounter@gmail.com from your
registered address and we will delete the account within 30 days.

---

## 10. Children

Expense Counter is not directed at children under 13, and we do not knowingly
collect personal data from them. If you believe a child has provided us data,
contact us and we will delete it.

---

## 11. International transfers

Your data may be processed on servers located outside your country. Where
required, our providers rely on standard contractual clauses for such transfers.

---

## 12. Changes to this policy

We may update this policy from time to time. Material changes will be surfaced in
the app before they take effect, and the "Last updated" date above will change.

---

## 13. Contact

For any privacy question or request:

**Email:** tushar.expensecounter@gmail.com
