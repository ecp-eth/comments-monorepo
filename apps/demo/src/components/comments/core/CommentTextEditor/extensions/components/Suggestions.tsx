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
    return null;
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
            {item.type === "ens" ? (
              <AccountSuggestion
                name={item.name}
                avatarUrl={item.avatarUrl}
                handle={item.name}
              />
            ) : null}
            {item.type === "farcaster" ? (
              <AccountSuggestion
                avatarUrl={item.pfpUrl}
                name={item.displayName || item.username}
                handle={item.fname}
              />
            ) : null}
            {item.type === "erc20" ? (
              <ERC20TokenSuggestion suggestion={item} />
            ) : null}
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

type AccountSuggestionProps = {
  avatarUrl: string | null | undefined;
  name: string;
  handle: string;
};

function AccountSuggestion({
  avatarUrl,
  name,
  handle,
}: AccountSuggestionProps) {
  return (
    <div className="flex flex-row items-center gap-2">
      <div
        className="rounded-full bg-cover bg-center size-12"
        style={{ backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined }}
      ></div>
      <div className="flex flex-col gap-1 items-start">
        <span className="text-sm">{name}</span>
        <span className="text-sm text-muted-foreground">{handle}</span>
      </div>
    </div>
  );
}

type ERC20TokenSuggestionProps = {
  suggestion: Extract<MentionSuggestionSchemaType, { type: "erc20" }>;
};

function ERC20TokenSuggestion({ suggestion }: ERC20TokenSuggestionProps) {
  return (
    <div className="flex flex-row items-center gap-2">
      <div
        className="rounded-full bg-cover bg-center size-12"
        style={{
          backgroundImage: suggestion.logoURI
            ? `url(${suggestion.logoURI})`
            : undefined,
        }}
      ></div>
      <div className="flex flex-col gap-1 items-start">
        <span className="text-sm">${suggestion.symbol}</span>
        <span className="text-sm text-muted-foreground">
          {getChainById(suggestion.chainId, Object.values(chains))?.name}
        </span>
      </div>
    </div>
  );
}
