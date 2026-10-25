import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateGroupBalances, simplifyDebts, splitEqual, splitExact, splitPercent } from './splits.ts';

test('splitEqual distributes 100 paise across three people', () => {
  assert.deepEqual(splitEqual(100, ['a', 'b', 'c']).map((row) => row.sharePaise), [34, 33, 33]);
});

test('splitEqual distributes 1 paise across three people', () => {
  assert.deepEqual(splitEqual(1, ['a', 'b', 'c']).map((row) => row.sharePaise), [1, 0, 0]);
});

test('splitPercent uses largest remainder rounding', () => {
  assert.deepEqual(
    splitPercent(100, [
      { userId: 'a', basisPoints: 3333 },
      { userId: 'b', basisPoints: 3333 },
      { userId: 'c', basisPoints: 3334 }
    ]).map((row) => row.sharePaise),
    [33, 33, 34]
  );
  assert.deepEqual(
    splitPercent(1, [
      { userId: 'a', basisPoints: 3333 },
      { userId: 'b', basisPoints: 3333 },
      { userId: 'c', basisPoints: 3334 }
    ]).map((row) => row.sharePaise),
    [0, 0, 1]
  );
});

test('splitExact rejects a mismatch', () => {
  assert.throws(() => splitExact(100, [
    { userId: 'a', sharePaise: 60 },
    { userId: 'b', sharePaise: 39 }
  ]), /add up/);
});

test('simplifyDebts handles two people', () => {
  assert.deepEqual(simplifyDebts([
    { userId: 'debtor', balancePaise: -100 },
    { userId: 'creditor', balancePaise: 100 }
  ]), [{ fromUser: 'debtor', toUser: 'creditor', amountPaise: 100 }]);
});

test('simplifyDebts handles three people and a zero balance', () => {
  assert.deepEqual(simplifyDebts([
    { userId: 'a', balancePaise: -100 },
    { userId: 'b', balancePaise: 40 },
    { userId: 'c', balancePaise: 60 },
    { userId: 'zero', balancePaise: 0 }
  ]), [
    { fromUser: 'a', toUser: 'c', amountPaise: 60 },
    { fromUser: 'a', toUser: 'b', amountPaise: 40 }
  ]);
});

test('simplifyDebts handles five people and multiple zero balances', () => {
  assert.deepEqual(simplifyDebts([
    { userId: 'a', balancePaise: -80 },
    { userId: 'b', balancePaise: -20 },
    { userId: 'c', balancePaise: 50 },
    { userId: 'd', balancePaise: 50 },
    { userId: 'e', balancePaise: 0 }
  ]), [
    { fromUser: 'a', toUser: 'c', amountPaise: 50 },
    { fromUser: 'a', toUser: 'd', amountPaise: 30 },
    { fromUser: 'b', toUser: 'd', amountPaise: 20 }
  ]);
});

test('simplifyDebts returns no transfers when every balance is zero', () => {
  assert.deepEqual(simplifyDebts([
    { userId: 'a', balancePaise: 0 },
    { userId: 'b', balancePaise: 0 }
  ]), []);
});

test('simplifyDebts returns no transfers before group details load', () => {
  assert.deepEqual(simplifyDebts([]), []);
});

test('calculateGroupBalances derives signed member positions that sum to zero', () => {
  const balances = calculateGroupBalances(
    [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }],
    [
      {
        paid_by: 'a',
        amount_paise: 900,
        splits: [
          { user_id: 'a', share_paise: 300 },
          { user_id: 'b', share_paise: 300 },
          { user_id: 'c', share_paise: 300 }
        ]
      }
    ],
    [{ from_user: 'b', to_user: 'a', amount_paise: 100 }]
  );

  assert.deepEqual(balances, [
    { userId: 'a', balancePaise: 500 },
    { userId: 'b', balancePaise: -200 },
    { userId: 'c', balancePaise: -300 }
  ]);
  assert.equal(
    balances.reduce((sum, balance) => sum + balance.balancePaise, 0),
    0
  );
});

test('calculateGroupBalances keeps balances balanced across many entries', () => {
  const balances = calculateGroupBalances(
    [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }, { user_id: 'd' }],
    [
      {
        paid_by: 'a',
        amount_paise: 1001,
        splits: [
          { user_id: 'a', share_paise: 251 },
          { user_id: 'b', share_paise: 250 },
          { user_id: 'c', share_paise: 250 },
          { user_id: 'd', share_paise: 250 }
        ]
      },
      {
        paid_by: 'b',
        amount_paise: 500,
        splits: [
          { user_id: 'a', share_paise: 100 },
          { user_id: 'b', share_paise: 200 },
          { user_id: 'c', share_paise: 100 },
          { user_id: 'd', share_paise: 100 }
        ]
      }
    ],
    [{ from_user: 'c', to_user: 'a', amount_paise: 57 }]
  );

  assert.equal(balances.length, 4);
  assert.equal(balances.reduce((sum, balance) => sum + BigInt(balance.balancePaise), 0n), 0n);
});

test('calculateGroupBalances rejects inconsistent data that cannot sum to zero', () => {
  assert.throws(
    () =>
      calculateGroupBalances(
        [{ user_id: 'a' }, { user_id: 'b' }],
        [
          {
            paid_by: 'a',
            amount_paise: 100,
            splits: [{ user_id: 'b', share_paise: 90 }]
          }
        ],
        []
      ),
    /sum to zero/
  );
});

test('calculateGroupBalances rejects duplicate members', () => {
  assert.throws(
    () => calculateGroupBalances([{ user_id: 'a' }, { user_id: 'a' }], [], []),
    /only once/
  );
});
