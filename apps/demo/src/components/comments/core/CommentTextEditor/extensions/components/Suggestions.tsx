import type { MentionSuggestionSchemaType } from "@/app/api/mention-suggestions/route";
import { cn } from "@/lib/utils";
import type { SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export type SuggestionsProps = SuggestionProps<MentionSuggestionSchemaType>;

export type SuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const Suggestions = forwardRef(function Suggestions(
  { command, items, query }: SuggestionsProps,
  ref: React.Ref<SuggestionsRef>,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!query || !items.length) {
    return null;
  }

  return (
    <div className="flex flex-col z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {items.length ? (
        items.map((item, index) => (
          <button
            className={cn(
              "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
              index === selectedIndex ? "bg-accent text-accent-foreground" : "",
            )}
            key={`${query}-${index}`}
            onClick={() => selectItem(index)}
          >
            <span>
              {item.type === "ens" ? item.name : item.symbol || item.name}
            </span>
          </button>
        ))
      ) : (
        <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
          Could not resolve
        </div>
      )}
    </div>
  );
});
