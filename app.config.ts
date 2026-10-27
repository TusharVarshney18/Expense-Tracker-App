import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expense Counter — Expo app configuration.
 *
 * APP_VARIANT is set per EAS build profile (see eas.json) so that development,
 * preview and production builds can be installed side by side on one device.
 *   - development -> com.tushar.expensecounter.dev
 *   - preview     -> com.tushar.expensecounter.preview
 *   - production  -> com.tushar.expensecounter
 *
 * Each variant also gets its own URL scheme so an OAuth redirect always returns
 * to the build that started the flow:
 *   - development -> expensecounter-dev
 *   - preview     -> expensecounter-preview
 *   - production  -> expensecounter
 *
 * Secrets are supplied through the environment (see .env.example). Nothing
 * sensitive is committed to this file.
 */

const APP_VARIANT = process.env.APP_VARIANT ?? 'production';

const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

function getPackageName(): string {
  if (IS_DEV) return 'com.tushar.expensecounter.dev';
  if (IS_PREVIEW) return 'com.tushar.expensecounter.preview';
  return 'com.tushar.expensecounter';
}

function getAppName(): string {
  if (IS_DEV) return 'Expense Counter (Dev)';
  if (IS_PREVIEW) return 'Expense Counter (Preview)';
  return 'Expense Counter';
}

function getScheme(): string {
  if (IS_DEV) return 'expensecounter-dev';
  if (IS_PREVIEW) return 'expensecounter-preview';
  return 'expensecounter';
}

/**
 * Universal-link / web-credentials domain for iOS. OAuth itself uses the
 * variant URL scheme above, so this is optional: set
 * EXPO_PUBLIC_ASSOCIATED_DOMAIN (or EXPO_PUBLIC_SITE_URL) only when the site
 * actually serves `/.well-known/apple-app-site-association`.
 */
function getAssociatedDomain(): string | null {
  const explicit = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');

  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return null;
  }
}

function getAssociatedDomains(): string[] | undefined {
  const domain = getAssociatedDomain();
  if (!domain) return undefined;
  return [`applinks:${domain}`, `webcredentials:${domain}`];
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'expense-counter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: getScheme(),
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],

  // iOS ships from the same codebase as Android with its own bundle id per
  // EAS profile (see getPackageName). Nothing Android-specific is applied here:
  // googleServicesFile, permissions and blockedPermissions live under `android`.
  ios: {
    supportsTablet: false,
    bundleIdentifier: getPackageName(),
    // Adds the com.apple.developer.applesignin entitlement (via the
    // expo-apple-authentication config plugin) and enables the capability when
    // EAS syncs credentials.
    usesAppleSignIn: true,
    associatedDomains: getAssociatedDomains(),
    infoPlist: {
      NSCameraUsageDescription:
        'Expense Counter uses your camera so you can attach a photo of a receipt to an expense.',
      NSFaceIDUsageDescription:
        'Expense Counter uses Face ID so only you can open the app and view your expenses and messages.',
      NSPhotoLibraryUsageDescription:
        'Expense Counter uses your photo library so you can attach a saved receipt photo to an expense.',
      ITSAppUsesNonExemptEncryption: false
    },
    // App Store privacy manifest. Expo/React Native and the native modules ship
    // their own manifests; this adds the reasons and data types the app itself
    // relies on. Keep the collected data in sync with the Data Safety answers
    // in docs/play-store-listing.md and the iOS nutrition labels in
    // docs/release-checklist.md.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyAccessedAPITypes: [
        {
          // AsyncStorage / preference storage.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1']
        },
        {
          // expo-file-system, expo-sqlite and image caches read file timestamps.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1']
        },
        {
          // expo-file-system checks free space before writing receipts/caches.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1']
        },
        {
          // React Native timers read the system boot time.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1']
        }
      ],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        },
        {
          // Expense amounts, split shares, settlements and the optional UPI ID.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherFinancialInfo',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        },
        {
          // In-app chat messages.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherUserContent',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        },
        {
          // Optional receipt photos.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosorVideos',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        },
        {
          // Expo push token.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeDeviceID',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
        }
      ]
    }
  },

  android: {
    package: getPackageName(),
    // Android-only. Never read on iOS, and the companion Gradle plugin is an
    // android finalized mod only.
    ...(APP_VARIANT === 'production' ? { googleServicesFile: './google-services.json' } : {}),
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon-foreground.png',
      backgroundImage: './assets/adaptive-icon-background.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png'
    },
    softwareKeyboardLayoutMode: 'pan',
    // Only permissions the app actually uses:
    //   POST_NOTIFICATIONS   - chat / expense reminder notifications
    //   USE_BIOMETRIC        - optional biometric app lock
    //   CAMERA               - attaching a receipt photo to an expense
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.USE_BIOMETRIC',
      'android.permission.CAMERA'
    ],
    // Explicitly remove permissions pulled in transitively by libraries
    // that Expense Counter does not use.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_SMS',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW'
    ]
  },

  web: {
    bundler: 'metro',
    output: 'static'
  },

  updates: {
    url: 'https://u.expo.dev/e7937b78-3015-4709-8195-c5d50f1f6ff6'
  },
  runtimeVersion: {
    policy: 'appVersion'
  },

  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Expense Counter needs access to your photos so you can attach a saved receipt to an expense.',
        cameraPermission:
          'Expense Counter needs access to your camera so you can photograph a receipt for an expense.'
      }
    ],
    [
      'expo-notifications',
      {
        // Default channel used for chat + reminder notifications (Android 8+).
        icon: './assets/notification-icon.png',
        color: '#3DDC97',
        defaultChannel: 'default'
      }
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0D12',
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#0B0D12',
          image: './assets/splash-icon.png'
        }
      }
    ],
    './plugins/withGoogleServicesGradle.cjs'
  ],

  experiments: {
    typedRoutes: true
  },

  extra: {
    // EAS project id for @varshney_g/expense-counter.
    eas: {
      projectId: 'e7937b78-3015-4709-8195-c5d50f1f6ff6'
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // The running build's URL scheme, used for the OAuth redirect.
    appScheme: getScheme(),
    privacyPolicyUrl:
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
      'https://tushar.github.io/expense-counter/privacy-policy',
    accountDeletionUrl:
      process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ??
      'https://tushar.github.io/expense-counter/account-deletion'
  }
});
