/**
 * Colour tokens. Every screen reads these through `useTheme()`; no screen
 * should contain a literal colour. `primary` is the single signature accent.
 */
export interface ColorTokens {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  onPrimary: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  accentBlue: string;
  accentViolet: string;
  accentPink: string;
  accentTeal: string;
  accentOrange: string;
  accentYellow: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  input: string;
  skeleton: string;
  skeletonHighlight: string;
  chartGrid: string;
  shadow: string;
  heroFrom: string;
  heroTo: string;
  heroOverFrom: string;
  heroText: string;
  heroMuted: string;
  heroBorder: string;
  heroTrack: string;
  /** Soft mint halo painted behind the auth screens. */
  authGlow: string;
  /** Surface of the floating split-bill illustration. */
  authCard: string;
  authCardBorder: string;
  /** Resting hairline of a text field (kept visible on both themes). */
  inputBorder: string;
  /** Outer mint ring shown while a field is focused. */
  focusRing: string;
  divider: string;
}

export const darkColors: ColorTokens = {
  background: '#0B0D12',
  backgroundAlt: '#0E1118',
  surface: '#141821',
  surfaceRaised: '#1B2030',
  surfaceSunken: '#0F131B',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F3F6FA',
  textSecondary: '#AAB4C5',
  textMuted: '#7A8497',
  textInverse: '#06130D',
  primary: '#3DDC97',
  primaryDeep: '#25B97B',
  primarySoft: 'rgba(61,220,151,0.13)',
  onPrimary: '#04251A',
  success: '#3DDC97',
  successSoft: 'rgba(61,220,151,0.13)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.13)',
  warning: '#F5B942',
  warningSoft: 'rgba(245,185,66,0.13)',
  info: '#7AA2FF',
  infoSoft: 'rgba(122,162,255,0.13)',
  accentBlue: '#6C9BFF',
  accentViolet: '#A78BFA',
  accentPink: '#F472B6',
  accentTeal: '#2DD4BF',
  accentOrange: '#FB923C',
  accentYellow: '#FBBF24',
  overlay: 'rgba(3,5,9,0.72)',
  tabBar: 'rgba(20,24,33,0.94)',
  tabBarBorder: 'rgba(255,255,255,0.10)',
  input: '#12161F',
  skeleton: '#1A1F2B',
  skeletonHighlight: '#242B3A',
  chartGrid: 'rgba(255,255,255,0.06)',
  shadow: '#000000',
  heroFrom: '#183A2D',
  heroTo: '#101A19',
  heroOverFrom: '#3A2027',
  heroText: '#F4FFF9',
  heroMuted: 'rgba(244,255,249,0.66)',
  heroBorder: 'rgba(61,220,151,0.22)',
  heroTrack: 'rgba(255,255,255,0.14)',
  authGlow: '#3DDC97',
  authCard: '#151A24',
  authCardBorder: 'rgba(61,220,151,0.16)',
  inputBorder: 'rgba(255,255,255,0.16)',
  focusRing: 'rgba(61,220,151,0.32)',
  divider: 'rgba(255,255,255,0.10)'
};

export const lightColors: ColorTokens = {
  background: '#F5F6F8',
  backgroundAlt: '#EFF1F4',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#EDF0F3',
  border: 'rgba(11,13,18,0.08)',
  borderStrong: 'rgba(11,13,18,0.16)',
  text: '#0B0D12',
  textSecondary: '#333D4D',
  textMuted: '#5F6B7C',
  textInverse: '#FFFFFF',
  primary: '#087C53',
  primaryDeep: '#05603F',
  primarySoft: 'rgba(8,124,83,0.10)',
  onPrimary: '#FFFFFF',
  success: '#087C53',
  successSoft: 'rgba(8,124,83,0.10)',
  danger: '#C43D3D',
  dangerSoft: 'rgba(196,61,61,0.10)',
  warning: '#A96A05',
  warningSoft: 'rgba(169,106,5,0.11)',
  info: '#2F62D8',
  infoSoft: 'rgba(47,98,216,0.10)',
  accentBlue: '#3768D8',
  accentViolet: '#7C5CE0',
  accentPink: '#C4388A',
  accentTeal: '#0F8F86',
  accentOrange: '#C2621B',
  accentYellow: '#9A6B00',
  overlay: 'rgba(11,13,18,0.46)',
  tabBar: 'rgba(255,255,255,0.96)',
  tabBarBorder: 'rgba(11,13,18,0.06)',
  input: '#F7F8FA',
  skeleton: '#E7EAEF',
  skeletonHighlight: '#F3F5F8',
  chartGrid: 'rgba(11,13,18,0.07)',
  shadow: '#0B0D12',
  heroFrom: '#0B3B2B',
  heroTo: '#0F5A40',
  heroOverFrom: '#5A2329',
  heroText: '#F2FFF9',
  heroMuted: 'rgba(242,255,249,0.68)',
  heroBorder: 'rgba(61,220,151,0.24)',
  heroTrack: 'rgba(255,255,255,0.18)',
  authGlow: '#087C53',
  authCard: '#FFFFFF',
  authCardBorder: 'rgba(11,13,18,0.08)',
  inputBorder: 'rgba(11,13,18,0.16)',
  focusRing: 'rgba(8,124,83,0.22)',
  divider: 'rgba(11,13,18,0.10)'
};
