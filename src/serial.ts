export function createWriteQueue() {
  const pending = new Map<string, Promise<unknown>>();
  return function enqueue<T>(key: string, write: () => Promise<T>): Promise<T> {
    const previous = pending.get(key);
    const result = previous ? previous.catch(() => {}).then(write) : Promise.resolve().then(write);
    pending.set(key, result);
    void result
      .finally(() => {
        if (pending.get(key) === result) pending.delete(key);
      })
      .catch(() => {});
    return result;
  };
}
