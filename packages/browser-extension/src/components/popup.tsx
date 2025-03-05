import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { CommentsProvider } from "@/providers/comments-provider";
import { CommentSection } from "./comments/CommentSection";

export function Popup() {
  const [targetUri, setTargetUri] = useState<string | undefined>();

  useEffect(() => {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
        status: "complete",
      },
      ([tab]) => {
        if (tab.url) {
          setTargetUri(tab.url);
        }
      }
    );
  }, []);

  if (!targetUri) {
    return null;
  }

  return (
    <CommentsProvider targetUri={targetUri}>
      <div className="flex flex-col gap-4 p-4 min-w-[400px] min-h-[500px]">
        <CommentSection />
      </div>
    </CommentsProvider>
  );
}
