/**
 * A small promise queue used to serialise SQLite writes.
 *
 * expo-sqlite only allows one transaction at a time on a connection. Starting a
 * second `withTransactionAsync` while another is in flight (for example two
 * Home-screen refreshes running together) produces:
 *
 *   cannot commit - no transaction is active
 *
 * Tasks run strictly in call order, and one failed task never blocks the ones
 * queued after it.
 */
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    // Keep the queue alive after failures; callers still receive the rejection.
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}

export type SerialQueue = ReturnType<typeof createSerialQueue>;
