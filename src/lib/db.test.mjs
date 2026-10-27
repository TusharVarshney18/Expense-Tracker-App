import assert from 'node:assert/strict';
import test from 'node:test';

import { createSerialQueue } from './serialQueue.ts';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('two concurrent cache refreshes never run their transactions at once', async () => {
  const enqueue = createSerialQueue();
  const events = [];
  let active = 0;
  let maxActive = 0;

  const refreshExpenses = (name) =>
    enqueue(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      events.push(`begin:${name}`);
      await delay(10);
      events.push(`commit:${name}`);
      active -= 1;
    });

  await Promise.all([refreshExpenses('first'), refreshExpenses('second')]);

  assert.equal(maxActive, 1, 'two transactions started at the same time');
  assert.deepEqual(events, [
    'begin:first',
    'commit:first',
    'begin:second',
    'commit:second'
  ]);
});

test('a failed cache write does not block the next queued write', async () => {
  const enqueue = createSerialQueue();
  const completed = [];

  const failing = enqueue(async () => {
    await delay(1);
    throw new Error('disk full');
  });
  const following = enqueue(async () => {
    completed.push('following');
  });

  await assert.rejects(failing, /disk full/);
  await following;
  assert.deepEqual(completed, ['following']);
});
