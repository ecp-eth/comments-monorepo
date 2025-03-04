import { createContext, useContext, useMemo, type ReactNode } from "react";

export const commentsContext = createContext({
  targetUri: "",
});

type CommentsProviderProps = {
  children: ReactNode;
  targetUri: string;
};

export function CommentsProvider({
  children,
  targetUri,
}: CommentsProviderProps) {
  const contextValue = useMemo(() => ({ targetUri }), [targetUri]);

  return (
    <commentsContext.Provider value={contextValue}>
      {children}
    </commentsContext.Provider>
  );
}

export function useCommentsContext() {
  return useContext(commentsContext);
}
