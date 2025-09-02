import { UseQueryResult } from "@tanstack/react-query";
import { UnauthorizedError } from "@/errors";

export function useProtectRoute(query: UseQueryResult) {
  if (query.status === "error" && query.error instanceof UnauthorizedError) {
    throw query.error;
  }
}
