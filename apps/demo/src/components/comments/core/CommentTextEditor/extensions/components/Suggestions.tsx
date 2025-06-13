import type { MentionSuggestionSchemaType } from "@/app/api/mention-suggestions/route";
import { cn } from "@/lib/utils";
import { getChainById } from "@ecp.eth/shared/helpers";
import type { SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import * as chains from "viem/chains";

export type SuggestionsProps = SuggestionProps<MentionSuggestionSchemaType> & {
  minimumQueryLength: number;
};

export type SuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const Suggestions = forwardRef(function Suggestions(
  { command, items, query, minimumQueryLength }: SuggestionsProps,
  ref: React.Ref<SuggestionsRef>,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];

    if (item) {
      command(item);
    }
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter" || event.key === " ") {
        const selectedItem = items[selectedIndex];

        if (!selectedItem) {
          // do not prevent enter/space if no item is selected
          return false;
        }

        selectItem(selectedIndex);

        // prevent default only if enter is pressed
        // so if user presses space, we choose an item and also add space after it
        // in case of enter we just select the item and keep the cursor after it
        return event.key === "Enter";
      }

      return false;
    },
  }));

  let children = null;

  if (query.trim().length < minimumQueryLength) {
    children = (
      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
        Type at least {minimumQueryLength} characters to see suggestions
      </div>
    );
  } else if (items.length === 0) {
    children = (
      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
        No results found
      </div>
    );
  } else {
    children = (
      <>
        {items.map((item, index) => (
          <button
            className={cn(
              "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
              index === selectedIndex ? "bg-accent text-accent-foreground" : "",
            )}
            key={`${query}-${index}`}
            onClick={() => selectItem(index)}
          >
            <span>
              {item.type === "ens" ? item.name : null}
              {item.type === "erc20"
                ? `${item.symbol || item.name || item.address} (${getChainById(item.chainId, Object.values(chains))?.name})`
                : null}
              {item.type === "farcaster" ? item.username : null}
            </span>
          </button>
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {children}
    </div>
  );
});
