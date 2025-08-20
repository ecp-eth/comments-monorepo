"use client";

import { useAuth } from "@/components/auth-provider";
import { UnauthorizedError } from "@/errors";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const auth = useAuth();

  useEffect(() => {
    if (error instanceof UnauthorizedError && auth.isLoggedIn) {
      auth.logout();
    } else {
      console.error(error);
    }
  }, [error, auth]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
