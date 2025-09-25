import { useAuth } from "@/components/auth-provider";
import { UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { createFetchUrl } from "@/lib/utils";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

type UseCreateWebhookMutationOptions = Omit<
  UseMutationOptions<boolean, Error, void>,
  "mutationFn"
>;

export function useDeleteMyAccountMutation({
  ...options
}: UseCreateWebhookMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async () => {
      const userDeleteResponse = await secureFetch(
        auth,
        async ({ headers }) => {
          return fetch(createFetchUrl(`/api/users/me`), {
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            method: "DELETE",
          });
        },
      );

      if (userDeleteResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (userDeleteResponse.status === 204) {
        return true;
      }

      if (!userDeleteResponse.ok) {
        throw new Error(
          `Failed to delete user: ${userDeleteResponse.statusText}`,
        );
      }

      throw new Error(
        `Failed to delete user: ${userDeleteResponse.statusText}`,
      );
    },
    ...options,
  });
}
