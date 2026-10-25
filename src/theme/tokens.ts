import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import type { ColorTokens } from './colors';

/** 8pt grid with a 4pt half-step for optical alignment. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  input: 14,
  card: 20,
  sheet: 28,
  hero: 24,
  pill: 999
} as const;

export const layout = {
  screenPadding: spacing.xl,
  tabBarHeight: 64,
  tabBarBottomGap: spacing.sm,
  tabBarContentInset: 128,
  authMaxWidth: 420,
  minTouch: 48,
  avatar: 44,
  icon: 20,
  hairline: 1
} as const;

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  money: 'SpaceGrotesk_700Bold'
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800'
} as const;

const moneyNumerals: TextStyle = {
  fontVariant: ['tabular-nums'],
  fontFeatureSettings: 'tnum'
};

export const typography = {
  hero: {
    fontFamily: fonts.money,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
    ...moneyNumerals
  },
  display: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4
  },
  subtitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22
  },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: 'uppercase'
  },
  button: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1
  },
  money: {
    fontFamily: fonts.money,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.6,
    ...moneyNumerals
  },
  moneySmall: {
    fontFamily: fonts.money,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
    ...moneyNumerals
  }
} satisfies Record<string, TextStyle>;

export interface ShadowTokens {
  card: ViewStyle;
  floating: ViewStyle;
  sheet: ViewStyle;
  glow: ViewStyle;
}

export function createShadows(colors: ColorTokens, isDark: boolean): ShadowTokens {
  if (isDark) {
    return {
      card: {
        shadowColor: colors.shadow,
        shadowOpacity: 0.4,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4
      },
      floating: {
        shadowColor: colors.shadow,
        shadowOpacity: 0.55,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10
      },
      sheet: {
        shadowColor: colors.shadow,
        shadowOpacity: 0.65,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: -8 },
        elevation: 18
      },
      glow: {
        shadowColor: colors.primary,
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8
      }
    };
  }
  return {
    card: {
      shadowColor: colors.shadow,
      shadowOpacity: Platform.OS === 'android' ? 0.08 : 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3
    },
    floating: {
      shadowColor: colors.shadow,
      shadowOpacity: Platform.OS === 'android' ? 0.14 : 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8
    },
    sheet: {
      shadowColor: colors.shadow,
      shadowOpacity: Platform.OS === 'android' ? 0.18 : 0.12,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: -6 },
      elevation: 16
    },
    glow: {
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5
    }
  };
}
