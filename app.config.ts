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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: 'expense-counter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'expensecounter',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],

  // iOS is configured for parity, but Google Play is the release target.
  ios: {
    supportsTablet: false,
    bundleIdentifier: getPackageName(),
    infoPlist: {
      NSCameraUsageDescription:
        'Expense Counter uses your camera so you can attach a photo of a receipt to an expense.',
      NSFaceIDUsageDescription:
        'Expense Counter uses Face ID so only you can open the app and view your expenses and messages.',
      NSPhotoLibraryUsageDescription:
        'Expense Counter uses your photo library so you can attach a saved receipt photo to an expense.',
      ITSAppUsesNonExemptEncryption: false
    }
  },

  android: {
    package: getPackageName(),
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
    ]
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
    privacyPolicyUrl:
      process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
      'https://tushar.github.io/expense-counter/privacy-policy',
    accountDeletionUrl:
      process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ??
      'https://tushar.github.io/expense-counter/account-deletion'
  }
});
