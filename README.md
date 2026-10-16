# Expense Counter

A private expense tracker with receipt photos and 1:1 chat, built with Expo
(React Native), Supabase and SQLite. Made by **Tushar**.

- Package: `com.tushar.expensecounter`
- Version: 1.0.0
- Platform target: Google Play (Android); iOS configured for parity.

## Features

- Expense tracking with categories, notes and optional receipt photos.
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
  (tabs)/                Expenses, Chat, Settings
  chat/[id].tsx          Conversation with report / block
  expense/new.tsx        Add expense (with receipt picker)
  legal/                 Privacy Policy and Terms screens
src/
  components/            Reusable UI
  context/               AuthProvider
  hooks/                 useExpenses, useMessages, useConversations, useBlockedUsers
  lib/                   supabase client, sqlite db, notifications, biometrics, storage
  services/              account deletion, moderation (report/block)
  content/legal.ts       In-app legal copy (single source)
supabase/
  schema.sql             Tables, triggers, delete_account() RPC
  policies.sql           Row Level Security + storage + realtime
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
