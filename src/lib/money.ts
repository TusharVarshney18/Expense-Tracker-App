/** Parse a rupee entry into exact integer paise without floating point math. */
export function parseRupeesToPaise(value: string): number | null {
  const trimmed = value.trim().replace(/^[₹\s]+|[\s,]+$/g, '');
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(trimmed);
  if (!match) return null;

  const rupeesText = match[1].replace(/^0+(?=\d)/, '');
  const paiseText = (match[2] ?? '').padEnd(2, '0');
  const rupees = Number(rupeesText);
  const paise = Number(paiseText || '0');
  const amount = rupees * 100 + paise;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function formatIndianInteger(value: string): string {
  if (value.length <= 3) return value;
  const lastThree = value.slice(-3);
  const leading = value.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${leading},${lastThree}`;
}

/** Convert a rupee amount (possibly fractional) to integer paise for display. */
export function rupeesToPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export interface PaiseParts {
  valid: boolean;
  negative: boolean;
  symbol: string;
  whole: string;
  fraction: string;
}

/** U+2212 MINUS SIGN. Never use a hyphen for negative money. */
export const MINUS_SIGN = '−';

export type MoneySign = '+' | '−' | '';

/**
 * Direction sign for a net amount, always derived from the numeric value.
 * Negative amounts are prefixed with U+2212, positive amounts get `+` only
 * when explicitly requested, and zero is always unsigned.
 */
export function paiseSign(amountPaise: number, includePlus = true): MoneySign {
  if (!Number.isSafeInteger(amountPaise) || amountPaise === 0) return '';
  if (amountPaise < 0) return MINUS_SIGN;
  return includePlus ? '+' : '';
}

/** Split an integer-paise amount into display parts for the Money component. */
export function formatPaiseParts(amountPaise: number): PaiseParts {
  if (!Number.isSafeInteger(amountPaise)) {
    return { valid: false, negative: false, symbol: '₹', whole: '—', fraction: '' };
  }
  const negative = amountPaise < 0;
  const digits = String(Math.abs(amountPaise)).padStart(3, '0');
  const rupees = digits.slice(0, -2).replace(/^0+(?=\d)/, '');
  const paise = digits.slice(-2);
  return {
    valid: true,
    negative,
    symbol: '₹',
    whole: formatIndianInteger(rupees),
    fraction: paise
  };
}

/** Format an integer-paise amount without converting it to fractional rupees. */
export function formatPaise(amountPaise: number): string {
  const parts = formatPaiseParts(amountPaise);
  if (!parts.valid) return `${parts.symbol}${parts.whole}`;
  return `${paiseSign(amountPaise, false)}${parts.symbol}${parts.whole}.${parts.fraction}`;
}

/**
 * Format a net amount with an explicit direction sign. The sign comes from the
 * numeric value: `+` for money owed to you, `−` for money you owe, and no sign
 * at zero. Never pass an absolute value and hard-code the sign separately.
 */
export function formatSignedPaise(amountPaise: number): string {
  const parts = formatPaiseParts(amountPaise);
  if (!parts.valid) return `${parts.symbol}${parts.whole}`;
  return `${paiseSign(amountPaise)}${parts.symbol}${parts.whole}.${parts.fraction}`;
}

/** Compact Indian grouping for chart axes, e.g. ₹1.2L or ₹24.5k. */
export function formatPaiseCompact(amountPaise: number): string {
  if (!Number.isSafeInteger(amountPaise)) return '₹—';
  const rupees = Math.abs(amountPaise) / 100;
  const sign = amountPaise < 0 ? MINUS_SIGN : '';
  if (rupees >= 10_000_000) return `${sign}₹${(rupees / 10_000_000).toFixed(1)}Cr`;
  if (rupees >= 100_000) return `${sign}₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `${sign}₹${(rupees / 1_000).toFixed(1)}k`;
  return `${sign}₹${Math.round(rupees)}`;
}

export function splitPaiseEqually(amountPaise: number, userIds: string[]) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || userIds.length === 0) {
    throw new Error('A positive whole-paise amount and at least one member are required.');
  }

  const baseShare = Math.floor(amountPaise / userIds.length);
  let remainder = amountPaise % userIds.length;
  return userIds.map((userId) => {
    const share = baseShare + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { user_id: userId, share_paise: share };
  });
}
