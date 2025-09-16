export async function waitForIndexerToBeReady(params: {
  signal: AbortSignal;
  indexerUrl: string;
}) {
  const { signal, indexerUrl } = params;

  while (true) {
    if (signal.aborted) {
      return;
    }

    try {
      const response = await fetch(new URL("/ready", indexerUrl), {
        signal,
      });

      if (response.status === 200) {
        return;
      }
    } catch (error) {
      console.error("Indexer is not ready yet", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
