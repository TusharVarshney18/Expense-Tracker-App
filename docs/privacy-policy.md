# Privacy Policy for Expense Counter

**Last updated: October 25, 2026**

Expense Counter ("the app", "we", "us") is developed and published by Tushar
("the developer"). This Privacy Policy explains what personal data the app
collects, why we collect it, how it is stored, who it is shared with, and how
you can delete it.

By installing and using Expense Counter you agree to this Privacy Policy. If you
do not agree, please do not use the app.

**Contact:** tusharvarshney1810@gmail.com
**Published at:** /privacy-policy

---

## 1. Summary

- We collect the minimum data needed to run the app: your account details, the
  expenses you record, shared group records, the messages and reports you send,
  and a device push token when notifications are enabled. Your monthly budget is
  stored on your device only.
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
| Display name | "Tushar" | Show your name to people you chat with and to members of your shared groups. |
| Profile photo (if provided by Google) | a profile image URL | Show your profile in the app. |
| Password | (stored only as a salted hash) | Authenticate you. We never see your password. |
| Optional UPI ID | name@bank | Show group members where to send an outside-app payment. |
| Terms acceptance date and version | date and version number | Record acceptance of the current Terms of Service. |

Authentication is provided by Supabase. You can register with an email and
password, use Google sign-in, or use Sign in with Apple on iOS. Passwords are
hashed by Supabase Auth and are never readable by the developer. If you choose
Google sign-in, Google shares the account information needed to authenticate
you, such as your email address, profile name, and profile photo. If you choose
Sign in with Apple, Apple shares the information needed to authenticate you,
such as your email address and (only on the first authorization) your name.
Apple may provide a private relay email address.

If you search for another user by their exact email address in chat, the app
checks whether an account matches and shows that person's profile name. The
address itself is not returned in search results or displayed to other users.

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
People who do not share a group can send one message as a request. The
recipient can accept or decline it. We store the request status and send a push
notification to the recipient for new requests and new messages, if
notifications are enabled on their device.

### 2.4 Block data
| Data | Example | Why |
| --- | --- | --- |
| Blocked account IDs | user UUIDs | Hide messages and prevent new messages between blocked users. |

### 2.5 Push token
| Data | Example | Why |
| --- | --- | --- |
| Expo push token | ExponentPushToken[xxxx] | Deliver push notifications for new chat requests and messages. |

### 2.6 Report data
| Data | Example | Why |
| --- | --- | --- |
| Report reason | "harassment" | Let you report abuse and let us review it. |
| Report details (optional) | free text | Additional context for a report. |

### 2.7 Data we do NOT collect
Location, contacts, calendar, SMS/call logs, health data, browsing history,
advertising identifiers, or crash/analytics telemetry.

### 2.8 Shared groups
| Data | Example | Why |
| --- | --- | --- |
| Group name and invite code | "Apartment" and a random code | Create groups and let invited people join. |
| Shared expense | amount in paise, description, category and date | Calculate group shares and balances. |
| Split shares | each member's integer-paise share | Show who owes or is owed money. |
| Settlement record | payer, recipient and amount in paise | Update balances after members record an outside-app payment. |
| Optional UPI ID | name@bank | Help group members identify where to send a payment. |

Members of a group can see that group's expenses, splits, settlements, member
display names and optional UPI IDs. An invite code gives anyone who receives it
the ability to join that group.

### 2.9 Device-local budget
| Data | Example | Why |
| --- | --- | --- |
| Monthly budget | 25,000.00 | Compare your monthly spending with a budget you set. |

Your monthly budget is stored only in app-local preferences on your device. It
is not uploaded to our servers.

---

## 3. How we use your data

We use your data only to provide the app:

1. **Authentication** — to create and secure your account.
2. **Expense tracking** — to display, total and store the expenses you add.
3. **Chat** — to deliver messages between you and recipients.
4. **Notifications** — to alert you to new chat requests and messages when notifications are enabled.
5. **Trust & safety** — to review reports of abuse and enforce our Terms.

Shared group data is used to calculate each member's balance and to show settle-up
suggestions. A settlement is only a record of a payment members report; the app
does not transfer money.

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
- For offline use, the app also keeps expenses and recent messages in its local
  SQLite database, and stores your monthly budget in app-local preferences. The
  app does not enable SQLCipher for this cache; it relies
  on Android/iOS app sandboxing and the device's own security. Sign-out and
  account deletion clear this cached account data and preference. Use a device
  screen lock and do not share an unlocked device.
- All traffic between the app and the servers is encrypted in transit (TLS).
- Data is encrypted at rest by the hosting provider.
- Row Level Security is enabled on every table: personal expense rows are
  readable only by their owner, shared group records only by group members, and
  messages only by their two participants. UPI IDs are available only to the
  account owner and members of their shared groups. Messages between a blocked
  user and you are hidden in both directions.
- Message recipients can review, accept, or decline requests. You can block a
  sender or report a user; blocking declines that sender's pending request.
  Reports are restricted to the app's review process and cannot be read by
  ordinary users.
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
| Google | Optional Google sign-in and Android OS-level push delivery (FCM) | Account information returned for sign-in; push token |
| Apple | Optional Sign in with Apple on iOS and iOS push delivery (APNs via Expo) | Account information returned for sign-in; push token |
| Other members of your group | Shared ledger and settle-up | Group expenses, splits, settlements, display name and optional UPI ID |

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
When you delete your account, the data described in section 9 is removed from
the app and server, including receipt photos. Email requests are processed
within 30 days.

---

## 9. Deleting your account and data

You can delete your account from inside the app:

**Settings → Delete account → confirm.**

If you cannot access the app, submit a request at
/account-deletion or email
tusharvarshney1810@gmail.com from your registered email address. Requests are
processed within 30 days.

Deleting your account permanently removes:

- your profile (email, display name, avatar);
- all of your personal expenses and their receipt images;
- all messages you have sent;
- your push token;
- shared expenses and settlements involving your account;
- the local database stored on your device.

If other members remain, the group continues and another member becomes its
admin. If you were the only member, the group is deleted. After deletion you are
signed out and the data cannot be recovered. If you
cannot access the app, email tusharvarshney1810@gmail.com from your
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

**Email:** tusharvarshney1810@gmail.com
