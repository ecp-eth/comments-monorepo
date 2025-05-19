export async function tryAsync<T>(
  fn: () => Promise<T>,
  {
    onError,
    retries = 10,
  }: {
    onError: (error: unknown) => void | Promise<void>;
    /**
     * @default 10
     */
    retries?: number;
  },
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`[tryAsync] error ${i + 1} of ${retries}`);
      console.error(error);

      await onError(error);

      if (i === retries - 1) {
        throw error;
      } else {
        console.log(`[tryAsync] retrying...`);
      }
    }
  }
}
