import { expect, it } from 'vitest';
import { createWriteQueue } from '../src/serial';
it('serializes saves for a work, so an old response cannot overwrite newer edits', async () => {
  const queue = createWriteQueue();
  const calls: string[] = [];
  let release!: () => void;
  const first = queue('work', async () => {
    calls.push('old');
    await new Promise<void>((r) => (release = r));
  });
  const second = queue('work', async () => {
    calls.push('new');
  });
  await Promise.resolve();
  expect(calls).toEqual(['old']);
  release();
  await Promise.all([first, second]);
  expect(calls).toEqual(['old', 'new']);
});
it('a failed save does not poison future retries', async () => {
  const queue = createWriteQueue();
  await expect(
    queue('work', async () => {
      throw new Error('offline');
    }),
  ).rejects.toThrow('offline');
  await expect(queue('work', async () => 42)).resolves.toBe(42);
});
