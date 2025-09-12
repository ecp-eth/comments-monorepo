export async function waitForIndexerToBeReady(params: { signal: AbortSignal }) {
  const { signal } = params;

  while (true) {
    if (signal.aborted) {
      return;
    }

    try {
      const response = await fetch("http://localhost:42069/ready");

      if (response.status === 200) {
        return;
      }
    } catch (error) {
      console.error("Indexer is not ready yet", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
