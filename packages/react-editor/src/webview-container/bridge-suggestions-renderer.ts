import { MentionOptions } from "@tiptap/extension-mention";
import { MentionItem } from "../types";
import { nativeWrap } from "./native-wrap";
import { log } from "./log";
import { webViewComSharedContext } from "./web-view-expose";

type SuggestionProps = {
  items: MentionItem[];
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: MentionItem) => void;
};

export const bridgeSuggestionsRenderer =
  (): MentionOptions<MentionItem, MentionItem>["suggestion"]["render"] =>
  () => {
    log("nativeSuggestionsRenderer constructed");
    return {
      onStart({ items, query, clientRect, command }: SuggestionProps) {
        const rect = clientRect?.();
        if (!rect) {
          return;
        }
        webViewComSharedContext.command = command;
        nativeWrap.onMentionSuggestionStart({
          items,
          query,
          clientRect: rect,
        });
      },
      onUpdate({ items, query, clientRect, command }: SuggestionProps) {
        const rect = clientRect?.();
        webViewComSharedContext.command = command;
        nativeWrap.onMentionSuggestionUpdate({
          items,
          query,
          clientRect: rect ?? undefined,
        });
      },
      onKeyDown() {
        return false;
      },
      onExit() {
        nativeWrap.onMentionSuggestionExit();
      },
    };
  };
