export const COLORS = {
  primary: '#0F766E',
  primaryDark: '#0B5D56',
  primaryTint: '#CCFBF1',
  accent: '#F59E0B',
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  background: '#F8FAFC',
  backgroundDark: '#0B1220',
  surface: '#FFFFFF',
  surfaceDark: '#111827',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textInverse: '#FFFFFF'
} as const;

export const EXPENSE_CATEGORIES = [
  'general',
  'food',
  'transport',
  'rent',
  'utilities',
  'shopping',
  'health',
  'entertainment',
  'education',
  'other'
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or unwanted advertising' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Something else' }
] as const;

export const CURRENCY_SYMBOL = '\u20B9';
