/**
 * Single source of truth for the in-app legal copy. The same wording is
 * published in docs/privacy-policy.md and docs/play-store-listing.md.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export const TERMS_VERSION = '2026-10-21';

export const PRIVACY_POLICY: { title: string; updated: string; sections: LegalSection[] } = {
  title: 'Privacy Policy',
  updated: 'October 21, 2026',
  sections: [
    {
      heading: 'Introduction',
      paragraphs: [
        'Expense Counter ("the app", "we") is built by Tushar. This policy explains what data the app collects, why it is collected, and how you can remove it. By using the app you agree to this policy.'
      ]
    },
    {
      heading: 'Data we collect',
      paragraphs: ['We collect only the data needed to run the app:'],
      bullets: [
        'Account data: your email address and the display name you provide at sign-up. Authentication is handled by Supabase; passwords are stored only as salted hashes and are never visible to us.',
        'Expense data: the amount, category, note, date and any optional receipt photo you attach to an expense you create.',
        'Shared group data: group names, invite codes, integer-paise expenses and splits, settlement records, your display name and an optional UPI ID. Group members can see their shared ledger, member display names and UPI IDs.',
        'Messages and requests: message content, request status, conversation participants, timestamps and read status for in-app chat.',
        'Push token: a device push token issued by Expo/Google so we can deliver notifications for message requests, chat messages and expense reminders.',
        'Report data: if you report a message or user, we store the reason and any details you provide so we can review the report.'
      ]
    },
    {
      heading: 'How we use your data',
      paragraphs: [
        'Your data is used solely to provide the app: to authenticate you, to show your personal expenses, to calculate shared group splits and balances, to record settle-up payments that members report, to deliver messages and requests, to send notifications you have opted into, and to review abuse reports. The app does not move money. We do not sell your data and we do not use it for advertising.'
      ]
    },
    {
      heading: 'Legal basis and retention',
      paragraphs: [
        'We process your data to perform our contract with you (providing the app). We keep your data for as long as your account exists. Expense records, group entries, messages, your profile and your push token are retained until you delete your account or the individual item.'
      ]
    },
    {
      heading: 'Sharing',
      paragraphs: [
        'Data is processed by Supabase (database, authentication and file storage) and by Expo and Google (push notification delivery). These providers act as processors on our behalf. Message content is visible only to you and the recipient. Members of a group can see that group’s expenses, splits, settlements, member display names and optional UPI IDs. Only you can retrieve your UPI ID outside your groups.'
      ]
    },
    {
      heading: 'Camera and photos',
      paragraphs: [
        'If you choose to attach a receipt, the app requests camera or photo-library access. Images are used only for the receipt you attach and are never collected in the background.'
      ]
    },
    {
      heading: 'Biometrics',
      paragraphs: [
        'The optional app lock uses your device biometrics. Biometric data never leaves your device and is never sent to us.'
      ]
    },
    {
      heading: 'Your controls',
      paragraphs: [
        'You can accept or decline message requests, block other users, and report messages or users. Blocking declines a pending request. You can also edit or delete individual personal expenses, update your group display name and UPI ID, leave a group after settling your balance, and delete your entire account from Settings > Delete account.'
      ]
    },
    {
      heading: 'Deleting your account',
      paragraphs: [
        'Deleting your account is immediate and permanent. It removes your profile, personal expenses, shared group expenses and settlements involving your account, messages you have sent, your push token and the app\'s local database on your device. If other members remain in a group, the group continues and another member becomes its admin; a group with no remaining members is deleted. After deletion you are signed out and can no longer recover the data.'
      ]
    },
    {
      heading: 'Children',
      paragraphs: [
        'Expense Counter is not directed to children under 13. We do not knowingly collect data from children.'
      ]
    },
    {
      heading: 'Changes',
      paragraphs: [
        'We may update this policy. Material changes will be shown in the app before they take effect.'
      ]
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions about privacy can be sent to tusharvarshney1810@gmail.com.'
      ]
    }
  ]
};

export const TERMS_OF_SERVICE: { title: string; updated: string; sections: LegalSection[] } = {
  title: 'Terms of Service',
  updated: 'October 21, 2026',
  sections: [
    {
      heading: 'Acceptance',
      paragraphs: [
        'By creating an account you agree to these Terms. If you do not agree, do not use the app.'
      ]
    },
    {
      heading: 'Your account',
      paragraphs: [
        'You are responsible for keeping your login credentials secure and for activity that happens under your account. You must provide accurate information and be at least 13 years old.'
      ]
    },
    {
      heading: 'Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Send spam, scams, hate speech, harassment or unlawful content in chat.',
        'Impersonate others or misrepresent your affiliation.',
        'Attempt to access other users\' data or interfere with the service.',
        'Upload content you do not have the right to share.'
      ]
    },
    {
      heading: 'Reports and blocking',
      paragraphs: [
        'People without a shared group send a message request, which the recipient can accept or decline. A pending request allows one message before acceptance. You can report a message or user and block other users. Blocking declines a pending request. We review reports and may suspend or remove accounts that violate these Terms. Messages with users you have blocked in either direction are hidden.'
      ]
    },
    {
      heading: 'Content',
      paragraphs: [
        'You keep ownership of the content you create (expenses, messages and shared group entries). You grant us a limited licence to store, transmit and display that content to operate the app for you and the group members you choose to share it with.'
      ]
    },
    {
      heading: 'Our content',
      paragraphs: [
        'The app, its name and its design are owned by Tushar and may not be copied or redistributed without permission.'
      ]
    },
    {
      heading: 'No financial advice',
      paragraphs: [
        'Expense Counter is a record-keeping tool. It does not provide financial, tax or investment advice. Group balances are calculations from member entries; a settlement records a payment made outside the app and does not move money.'
      ]
    },
    {
      heading: 'Availability and liability',
      paragraphs: [
        'The app is provided "as is". We strive for high availability but do not guarantee uninterrupted service. To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of the app.'
      ]
    },
    {
      heading: 'Termination',
      paragraphs: [
        'You may stop using the app and delete your account at any time from Settings. We may suspend accounts that breach these Terms.'
      ]
    },
    {
      heading: 'Contact',
      paragraphs: [
        'Questions about these Terms can be sent to tusharvarshney1810@gmail.com.'
      ]
    }
  ]
};
