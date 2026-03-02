"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HookFeeAnalysis } from "./queries/analyzeHookFee";

type TransactionWarningContextType = {
  confirmTransaction: (analysis: HookFeeAnalysis) => Promise<boolean>;
};

const TransactionWarningContext =
  createContext<TransactionWarningContextType | null>(null);

export function useTransactionWarning() {
  const ctx = useContext(TransactionWarningContext);
  if (!ctx) {
    throw new Error(
      "useTransactionWarning must be used within TransactionWarningProvider",
    );
  }
  return ctx;
}

export function TransactionWarningProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [analysis, setAnalysis] = useState<HookFeeAnalysis | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirmTransaction = useCallback(
    (feeAnalysis: HookFeeAnalysis): Promise<boolean> => {
      setAnalysis(feeAnalysis);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setAnalysis(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setAnalysis(null);
  }, []);

  const contextValue = useMemo(
    () => ({ confirmTransaction }),
    [confirmTransaction],
  );

  return (
    <TransactionWarningContext.Provider value={contextValue}>
      {children}
      <Dialog
        open={!!analysis}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent className="apply-theme">
          <DialogHeader>
            <DialogTitle>Confirm fee</DialogTitle>
            <DialogDescription>
              This action has an associated fee.
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <div className="flex flex-col gap-2 text-sm">
              {analysis.nativeEthCost > 0n && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium">
                    {analysis.nativeEthCostFormatted}
                    {analysis.nativeEthCostUsd > 0 && (
                      <span className="text-muted-foreground ml-1">
                        (~
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(analysis.nativeEthCostUsd)}
                        )
                      </span>
                    )}
                  </span>
                </div>
              )}

              {analysis.erc20Approval && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Token transfer</span>
                  <span className="font-medium">
                    {analysis.erc20Approval.amountFormatted}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <Button type="button" onClick={handleConfirm} className="w-full">
              Proceed
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TransactionWarningContext.Provider>
  );
}
