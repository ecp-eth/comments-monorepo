import { useMutation } from "@tanstack/react-query";
import { useSignTypedData } from "wagmi";
import type { Hex } from "../../core/schemas.js";
import { SignTypedDataVariables } from "wagmi/query";

/**
 * A hook for repeat gasless transaction pattern
 *
 * Gasless transaction typically requires 3 steps:
 * 1. prepare typed data to be passed to `signTypedData`, typically this is also created from server side with an app signature.
 * 2. sign typed data on client side
 * 3. send the dual signed data to server
 *
 * This hook abstracts these steps and help with the repetition of the pattern.
 *
 * @category Hooks
 * @param props
 * @returns
 */
export function useGaslessTransaction<
  TVariables extends object | undefined,
  TReturnValue,
  TInputVariables = void,
  TSignTypedDataParams extends SignTypedDataVariables = SignTypedDataVariables,
>(props: {
  prepareSignTypedDataParams: (variables: TInputVariables) => Promise<
    | TSignTypedDataParams
    | {
        signTypedDataParams: TSignTypedDataParams;
        /** Miscellaneous data passed to be passed to sendSignedData */
        variables: TVariables;
      }
  >;
  signTypedData?: (signTypedDataParams: TSignTypedDataParams) => Promise<Hex>;
  sendSignedData: (args: {
    signTypedDataParams: TSignTypedDataParams;
    signature: Hex;
    /** Miscellaneous data passed from prepareSignTypedDataParams */
    variables: TVariables;
  }) => Promise<TReturnValue>;
}) {
  const { signTypedDataAsync } = useSignTypedData();

  return useMutation<TReturnValue, Error, TInputVariables>({
    mutationFn: async (inputVariables) => {
      const signTypedDataFn = props.signTypedData ?? signTypedDataAsync;

      const prepareResult =
        await props.prepareSignTypedDataParams(inputVariables);
      const signTypedDataParams =
        "signTypedDataParams" in prepareResult
          ? prepareResult.signTypedDataParams
          : prepareResult;
      const signature = await signTypedDataFn(signTypedDataParams);

      const signedData = await props.sendSignedData({
        signTypedDataParams,
        signature,
        variables:
          "variables" in prepareResult
            ? prepareResult.variables
            : (undefined as TVariables),
      });
      return signedData;
    },
  });
}
