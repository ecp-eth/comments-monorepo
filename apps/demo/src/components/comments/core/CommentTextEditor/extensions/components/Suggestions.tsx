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

      if (event.key === "Enter") {
        const selectedItem = items[selectedIndex];

        if (!selectedItem) {
          // do not prevent enter/space if no item is selected
          return false;
        }

        selectItem(selectedIndex);

        return true;
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
    <div className="flex flex-row items-center gap-2 w-full min-w-0">
      <div
        className="rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0"
        style={{
          backgroundImage: `url(${avatarUrl || "data:image/svg+xml;base64,CiAgPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMTAgMTEwIj4KICAgIDxkZWZzPgogICAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imd6ciIgeDE9IjEwNi45NzUiIHkxPSIxMzYuMTU2IiB4Mj0iLTEyLjk4MTUiIHkyPSIxMy41MzQ3IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CiAgICAgICAgZ3JhZGllbnRUcmFuc2Zvcm09InRyYW5zbGF0ZSgxMzEuNjM4IDEyOS44MzUpIHJvdGF0ZSgtMTQxLjE5NCkgc2NhbGUoMTg1LjU4MikiPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC4xNTYyIiBzdG9wLWNvbG9yPSJoc2woMTQxLCA4NiUsIDkwJSkiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIwLjM5NTgiIHN0b3AtY29sb3I9ImhzbCgxNDEsIDg3JSwgNjglKSIgLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjAuNzI5MiIgc3RvcC1jb2xvcj0iaHNsKDIyMSwgODklLCA0NSUpIiAvPgogICAgICAgIDxzdG9wIG9mZnNldD0iMC45MDYzIiBzdG9wLWNvbG9yPSJoc2woMjMxLCA5NCUsIDM2JSkiIC8+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSJoc2woMjMxLCA5NiUsIDM2JSkiIC8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgICA8cGF0aAogICAgICBkPSJNMTEwIDU1QzExMCAyNC42MjQ0IDg1LjM3NTYgMCA1NSAwQzI0LjYyNDQgMCAwIDI0LjYyNDQgMCA1NUMwIDg1LjM3NTYgMjQuNjI0NCAxMTAgNTUgMTEwQzg1LjM3NTYgMTEwIDExMCA4NS4zNzU2IDExMCA1NVoiCiAgICAgIGZpbGw9InVybCgjZ3pyKSIgLz4KICA8L3N2Zz4KICAgIA=="}`,
        }}
      ></div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm truncate w-full text-left">{name}</span>
        <span className="text-sm text-muted-foreground truncate w-full text-left">
          {handle}
        </span>
      </div>
    </div>
  );
}

type ERC20TokenSuggestionProps = {
  suggestion: Extract<MentionSuggestionSchemaType, { type: "erc20" }>;
};

function ERC20TokenSuggestion({ suggestion }: ERC20TokenSuggestionProps) {
  return (
    <div className="flex flex-row items-center gap-2 w-full min-w-0">
      <div
        className="rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0"
        style={{
          backgroundImage: suggestion.logoURI
            ? `url(${suggestion.logoURI})`
            : undefined,
        }}
      ></div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm truncate w-full text-left">
          ${suggestion.symbol}
        </span>
        <span className="text-sm text-muted-foreground truncate w-full text-left">
          {getChainById(suggestion.chainId, Object.values(chains))?.name}
        </span>
      </div>
    </div>
  );
}
