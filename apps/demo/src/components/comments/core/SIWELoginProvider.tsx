import z from "zod";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { SIWETokens, SIWETokensSchema } from "@/lib/schemas";
import { SiweMessage } from "siwe";
import { getIndexerURL } from "@/lib/utils";
import { usePendingWalletConnectionActionsContext } from "@ecp.eth/shared/components";
import { useAccount, useAccountEffect, useConfig } from "wagmi";
import { chain } from "@/lib/clientWagmi";
import {
  IndexerSIWEVerifyRequestPayloadSchema,
  IndexerSIWEVerifyResponseBodySchema,
} from "@ecp.eth/shared/schemas/indexer-siwe-api/verify";
// import { IndexerSIWERefreshResponseBodySchema } from "@ecp.eth/shared/schemas/indexer-siwe-api/refresh";
import { getWalletClient } from "@wagmi/core";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import { useCommentGaslessContext } from "@/components/comments/gasless/CommentGaslessProvider";
import { Hex } from "@ecp.eth/sdk/core/schemas";

const SIWE_TOKENS_STORAGE_KEY = "siwe-tokens";
export const SIWELoginProviderContext = createContext<{
  tokens?: SIWETokens;
}>({});

// had to use a singleton instead of a ref to workaround context circular references issue
export const siweTokenSingleton: {
  current?: SIWETokens;
} = {};

export function SIWELoginProvider({ children }: PropsWithChildren) {
  const { address: connectedAddress } = useAccount();

  useEffect(() => {
    if (!connectedAddress) {
      return;
    }

    const tokens = localStorage.getItem(SIWE_TOKENS_STORAGE_KEY);

    if (!tokens) {
      return;
    }

    const parseResult = SIWETokensSchema.safeParse(JSON.parse(tokens));
    if (!parseResult.success) {
      localStorage.removeItem(SIWE_TOKENS_STORAGE_KEY);
      return;
    }

    const siweTokens = parseResult.data;

    if (!areTokensActiveAndCurrent(siweTokens, connectedAddress)) {
      localStorage.removeItem(SIWE_TOKENS_STORAGE_KEY);
      return;
    }

    siweTokenSingleton.current = siweTokens;
  }, [connectedAddress]);

  useSIWELogin((tokens) => {
    siweTokenSingleton.current = tokens;
    localStorage.setItem(SIWE_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  });

  return (
    <SIWELoginProviderContext.Provider
      value={{
        get tokens() {
          return siweTokenSingleton.current;
        },
      }}
    >
      {children}
    </SIWELoginProviderContext.Provider>
  );
}

export function useSIWELoginProvider() {
  return useContext(SIWELoginProviderContext);
}

/**
 * Call this hook to make sure user is SIWE-logged in after wallet is connected
 *
 * @param onSuccess
 */
function useSIWELogin(onSuccess: (tokens: SIWETokens) => void) {
  const { address: connectedAddress } = useAccount();
  const wagmiConfig = useConfig();

  const pendingWalletConnectionActions =
    usePendingWalletConnectionActionsContext();
  const onSuccessRef = useFreshRef(onSuccess);
  const gaslessContextValue = useCommentGaslessContext();
  const loginPromiseRef = useRef<Promise<void> | undefined>(undefined);

  const handleSIWELogin = useCallback(() => {
    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }

    loginPromiseRef.current = (async () => {
      if (!connectedAddress) {
        return;
      }

      if (!gaslessContextValue.areApprovalsEnabled) {
        return;
      }

      if (!gaslessContextValue.isApproved) {
        // no need to sign in if we are not gonna use preapproved flow
        return;
      }

      if (
        siweTokenSingleton.current &&
        areTokensActiveAndCurrent(siweTokenSingleton.current, connectedAddress)
      ) {
        return;
      }

      const walletClient = getWalletClient(wagmiConfig);
      onSuccessRef.current(await getNewTokens(connectedAddress, walletClient));
    })().finally(() => {
      loginPromiseRef.current = undefined;
    });

    return loginPromiseRef.current;
  }, [
    connectedAddress,
    gaslessContextValue.areApprovalsEnabled,
    gaslessContextValue.isApproved,
    onSuccessRef,
    wagmiConfig,
  ]);

  useAccountEffect({
    onConnect: () => {
      handleSIWELogin();
    },
  });

  useEffect(() => {
    pendingWalletConnectionActions.onAfterConnect = async () => {
      await handleSIWELogin();
    };
  }, [handleSIWELogin, pendingWalletConnectionActions]);
}

function areTokensActiveAndCurrent(tokens: SIWETokens, address: Hex): boolean {
  if (
    tokens.address !== address ||
    tokens.accessToken.expiresAt < Math.floor(Date.now()) ||
    tokens.refreshToken.expiresAt < Math.floor(Date.now())
  ) {
    return false;
  }

  return true;
}

// async function refreshTokens(
//   tokens: SIWETokens,
//   onSuccess: (tokens: SIWETokens) => void,
// ) {
//   const refreshResponse = await fetch(getIndexerURL("/api/auth/siwe/refresh"), {
//     method: "POST",
//     headers: {
//       Authorization: `${tokens.refreshToken.token}`,
//     },
//   });

//   if (!refreshResponse.ok) {
//     throw new Error("Failed to refresh tokens");
//   }

//   const refreshResponseData = await refreshResponse.json();

//   const { accessToken, refreshToken } =
//     IndexerSIWERefreshResponseBodySchema.parse(refreshResponseData);

//   onSuccess({
//     address: tokens.address,
//     accessToken,
//     refreshToken,
//   });
// }

async function getNewTokens(
  address: Hex,
  walletClient: ReturnType<typeof getWalletClient>,
) {
  const nonceResponse = await fetch(getIndexerURL("/api/auth/siwe/nonce"));

  if (!nonceResponse.ok) {
    throw new Error("Failed to get nonce");
  }

  const nonceResponseData = await nonceResponse.json();

  const { nonce, token: nonceToken } = z
    .object({
      nonce: z.string(),
      token: z.string(),
    })
    .parse(nonceResponseData);

  const message = new SiweMessage({
    domain: window.location.host,
    address,
    statement: "Sign in with Ethereum to comment on ECP Demo",
    uri: window.location.origin,
    version: "1",
    chainId: chain.id,
    nonce,
  }).prepareMessage();

  const signature = await (
    await walletClient
  ).signMessage({
    message,
  });

  const verifyResponse = await fetch(getIndexerURL("/api/auth/siwe/verify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      signature,
      token: nonceToken,
    } satisfies z.input<typeof IndexerSIWEVerifyRequestPayloadSchema>),
  });

  if (!verifyResponse.ok) {
    throw new Error("Failed to verify signature");
  }

  const verifyResponseData = await verifyResponse.json();

  const { accessToken, refreshToken } =
    IndexerSIWEVerifyResponseBodySchema.parse(verifyResponseData);

  return {
    address,
    accessToken,
    refreshToken,
  };
}
