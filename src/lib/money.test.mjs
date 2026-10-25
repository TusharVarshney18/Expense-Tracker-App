import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPaise, formatPaiseParts, formatSignedPaise, paiseSign } from './money.ts';

test('paiseSign derives the sign from the numeric amount', () => {
  assert.equal(paiseSign(250_000), '+');
  assert.equal(paiseSign(-250_000), '\u2212');
  assert.equal(paiseSign(0), '');
  assert.equal(paiseSign(250_000, false), '');
  assert.equal(paiseSign(-250_000, false), '\u2212');
  assert.equal(paiseSign(0, false), '');
});

test('formatSignedPaise adds a plus for a positive balance', () => {
  assert.equal(formatSignedPaise(250_000), '+₹2,500.00');
});

test('formatSignedPaise uses a proper minus sign for a negative balance', () => {
  const formatted = formatSignedPaise(-250_000);
  assert.equal(formatted, '−₹2,500.00');
  assert.ok(formatted.startsWith('\u2212'), 'expected U+2212 MINUS SIGN');
  assert.ok(!formatted.startsWith('-'), 'must not use an ASCII hyphen');
});

test('formatSignedPaise leaves zero unsigned', () => {
  assert.equal(formatSignedPaise(0), '₹0.00');
});

test('formatPaise derives the sign from the numeric value', () => {
  assert.equal(formatPaise(250_000), '₹2,500.00');
  assert.equal(formatPaise(-250_000), '−₹2,500.00');
  assert.equal(formatPaise(0), '₹0.00');
});

test('formatPaiseParts exposes the sign and Indian grouping', () => {
  assert.deepEqual(formatPaiseParts(-123_456_789), {
    valid: true,
    negative: true,
    symbol: '₹',
    whole: '12,34,567',
    fraction: '89'
  });
  assert.deepEqual(formatPaiseParts(123_456_789), {
    valid: true,
    negative: false,
    symbol: '₹',
    whole: '12,34,567',
    fraction: '89'
  });
  assert.deepEqual(formatPaiseParts(0), {
    valid: true,
    negative: false,
    symbol: '₹',
    whole: '0',
    fraction: '00'
  });
});
