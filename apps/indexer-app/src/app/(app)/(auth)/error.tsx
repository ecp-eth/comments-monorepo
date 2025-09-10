"use client";

import { useAuth } from "@/components/auth-provider";
import { UnauthorizedError } from "@/errors";
import { useEffect } from "react";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const auth = useAuth();

  useEffect(() => {
    if (error instanceof UnauthorizedError) {
      if (auth.isLoggedIn) {
        auth.logout();
      }
    } else {
      console.error(error);
    }
  }, [error, auth]);

  return (
    <ErrorScreen
      title="Something went wrong!"
      description="Please try again later. If the problem persists, please contact support."
      actions={<Button onClick={() => reset()}>Try again</Button>}
    />
  );
}
