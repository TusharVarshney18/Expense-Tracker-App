import type { Ionicons } from '@expo/vector-icons';

import type { ColorTokens } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type CategoryColorKey =
  | 'primary'
  | 'warning'
  | 'info'
  | 'accentBlue'
  | 'accentViolet'
  | 'accentPink'
  | 'accentTeal'
  | 'accentOrange'
  | 'accentYellow'
  | 'danger';

export interface CategoryMeta {
  icon: IconName;
  colorKey: CategoryColorKey;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  general: { icon: 'receipt-outline', colorKey: 'info' },
  food: { icon: 'restaurant-outline', colorKey: 'warning' },
  transport: { icon: 'car-sport-outline', colorKey: 'accentBlue' },
  rent: { icon: 'home-outline', colorKey: 'accentViolet' },
  utilities: { icon: 'flash-outline', colorKey: 'accentYellow' },
  shopping: { icon: 'bag-handle-outline', colorKey: 'accentPink' },
  health: { icon: 'medkit-outline', colorKey: 'danger' },
  entertainment: { icon: 'film-outline', colorKey: 'accentTeal' },
  education: { icon: 'school-outline', colorKey: 'accentOrange' },
  other: { icon: 'ellipsis-horizontal-circle-outline', colorKey: 'primary' }
};

export function categoryMeta(category: string | null | undefined): CategoryMeta {
  const key = (category ?? 'general').trim().toLowerCase();
  return CATEGORY_META[key] ?? CATEGORY_META.general;
}

export function categoryColor(colors: ColorTokens, category: string | null | undefined): string {
  const { colorKey } = categoryMeta(category);
  return colors[colorKey];
}

export function categoryWithAlpha(color: string, alpha: string): string {
  // Category colours are always 6-digit hex tokens.
  return `${color}${alpha}`;
}
