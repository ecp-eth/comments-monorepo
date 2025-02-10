/**
 * - Get data to sign from server
 * - Sign data
 * - Send signed data to server
 * - Wait for transaction hash
 */

import { useMutation } from "@tanstack/react-query";
import { Hex, SignTypedDataParameters } from "viem";
import { useSignTypedData } from "wagmi";

export function useGaslessTransaction(props: {
  prepareSignTypedData: () => Promise<
    | SignTypedDataParameters
    | {
        signTypedDataArgs: SignTypedDataParameters;
        /** Miscellaneous data passed to be passed to sendSignedData */
        variables?: object;
      }
  >;
  signTypedData?: (signTypedDataArgs: SignTypedDataParameters) => Promise<Hex>;
  sendSignedData: (args: {
    signature: Hex;
    /** Miscellaneous data passed from prepareSignTypedData */
    variables?: object;
  }) => Promise<Hex>;
}) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation({
    mutationFn: async () => {
      const signTypedDataFn = props.signTypedData ?? signTypedDataAsync;

      const prepareResult = await props.prepareSignTypedData();
      const signature = await signTypedDataFn(
        "signTypedDataArgs" in prepareResult
          ? prepareResult.signTypedDataArgs
          : prepareResult
      );
      const signedData = await props.sendSignedData({
        signature,
        variables: "variables" in prepareResult ? prepareResult.variables : {},
      });
      return signedData;
    },
  });
}
