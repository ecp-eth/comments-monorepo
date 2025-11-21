import { createContext, useContext, PropsWithChildren, useState } from "react";

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
  const [config, setConfig] = useState<LayoutConfig>({
    commentForm: "on-top",
    toggle: () => {
      setConfig((prev) => {
        return {
          ...prev,
          commentForm: prev.commentForm === "on-top" ? "on-bottom" : "on-top",
        };
      });
    },
  });

  return (
    <LayoutConfigContext.Provider value={config}>
      {children}
    </LayoutConfigContext.Provider>
  );
}

export const useLayoutConfigContext = () => {
  return useContext(LayoutConfigContext);
};
