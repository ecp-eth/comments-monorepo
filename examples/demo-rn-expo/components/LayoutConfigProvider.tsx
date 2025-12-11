import {
  createContext,
  useContext,
  PropsWithChildren,
  useState,
  useCallback,
  useMemo,
} from "react";

type CommentFormType = "on-top" | "on-bottom";
type LayoutConfig = {
  commentForm: CommentFormType;
  toggle: () => void;
};
const LayoutConfigContext = createContext<LayoutConfig>({
  commentForm: "on-top",
  toggle: () => {},
});
export function LayoutConfigProvider({ children }: PropsWithChildren) {
  const [commentForm, setCommentForm] = useState<CommentFormType>("on-top");
  const toggle = useCallback(() => {
    setCommentForm((prev) => (prev === "on-top" ? "on-bottom" : "on-top"));
  }, []);

  const config = useMemo(
    () => ({ commentForm, toggle }),
    [commentForm, toggle],
  );

  return (
    <LayoutConfigContext.Provider value={config}>
      {children}
    </LayoutConfigContext.Provider>
  );
}

export const useLayoutConfigContext = () => {
  return useContext(LayoutConfigContext);
};
