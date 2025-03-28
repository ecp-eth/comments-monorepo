import { useEffect, useState } from "react";

/**
 * A hook that returns true if the component is mounted.
 * useful in the context to avoid rendering components on SSR.
 * @returns true if the component is mounted
 */
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
