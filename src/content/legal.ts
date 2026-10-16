/**
 * Single source of truth for the in-app legal copy. The same wording is
 * published in docs/privacy-policy.md and docs/play-store-listing.md.
 */

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export const PRIVACY_POLICY: { title: string; updated: string; sections: LegalSection[] } = {
  title: 'Privacy Policy',
  updated: 'October 17, 2026',
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
        'Messages: the content of messages you send to other users in the in-app chat, plus timestamps and read status.',
        'Push token: a device push token issued by Expo/Google so we can deliver notifications for chat messages and expense reminders.',
        'Report data: if you report a message or user, we store the reason and any details you provide so we can review the report.'
      ]
    },
    {
      heading: 'How we use your data',
      paragraphs: [
        'Your data is used solely to provide the app: to authenticate you, to show your expenses and totals, to deliver messages between you and the people you chat with, to send notifications you have opted into, and to review abuse reports. We do not sell your data and we do not use it for advertising.'
      ]
    },
    {
      heading: 'Legal basis and retention',
      paragraphs: [
        'We process your data to perform our contract with you (providing the app). We keep your data for as long as your account exists. Expense records, messages, your profile and your push token are retained until you delete your account or the individual item.'
      ]
    },
    {
      heading: 'Sharing',
      paragraphs: [
        'Data is processed by Supabase (database, authentication and file storage) and by Expo and Google (push notification delivery). These providers act as processors on our behalf. Message content is visible only to you and the recipient.'
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
        'You can edit or delete individual expenses at any time, block other users, and report messages or users. You can also delete your entire account from Settings > Delete account.'
      ]
    },
    {
      heading: 'Deleting your account',
      paragraphs: [
        'Deleting your account is immediate and permanent. It removes your profile, all of your personal expenses, all messages you have sent, your push token and the app\'s local database on your device. After deletion you are signed out and can no longer recover the data.'
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
        'Questions about privacy can be sent to tushar.expensecounter@gmail.com.'
      ]
    }
  ]
};

export const TERMS_OF_SERVICE: { title: string; updated: string; sections: LegalSection[] } = {
  title: 'Terms of Service',
  updated: 'October 17, 2026',
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
        'You can report a message or user and block other users. We review reports and may suspend or remove accounts that violate these Terms. Messages with users you have blocked in either direction are hidden.'
      ]
    },
    {
      heading: 'Content',
      paragraphs: [
        'You keep ownership of the content you create (expenses and messages). You grant us a limited licence to store and transmit that content solely to operate the app for you.'
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
        'Expense Counter is a personal record-keeping tool. It does not provide financial, tax or investment advice.'
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
        'Questions about these Terms can be sent to tushar.expensecounter@gmail.com.'
      ]
    }
  ]
};
