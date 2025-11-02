export type FetchFn = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>;
