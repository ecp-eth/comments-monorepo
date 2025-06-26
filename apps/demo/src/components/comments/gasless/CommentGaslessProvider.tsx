import { createContext, useContext } from "react";

export type CommentGaslessProviderContextType = {
  isApproved: boolean;
  areApprovalsEnabled: boolean;
};

const CommentGaslessProviderContext =
  createContext<CommentGaslessProviderContextType>({
    isApproved: false,
    areApprovalsEnabled: false,
  });

export function CommentGaslessProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CommentGaslessProviderContextType;
}) {
  return (
    <CommentGaslessProviderContext.Provider value={value}>
      {children}
    </CommentGaslessProviderContext.Provider>
  );
}

export function useCommentGaslessContext() {
  return useContext(CommentGaslessProviderContext);
}
