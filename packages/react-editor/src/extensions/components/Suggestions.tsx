import { isValidQuery } from "../helpers";
import { cn, getChainById } from "@ecp.eth/shared/helpers";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as chains from "viem/chains";
import type { Hex } from "viem";
import type { Erc20MentionSuggestion, MentionItem } from "../types";

export type SuggestionsProps = SuggestionProps<MentionItem> & {
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
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const selectItem = (index: number) => {
    const item = items[index];

    if (item) {
      command(item);
    }
  };

  useEffect(() => setSelectedIndex(0), [items]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

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

  if (!isValidQuery(query, minimumQueryLength)) {
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
            ref={index === selectedIndex ? selectedItemRef : null}
            className={cn(
              "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
              index === selectedIndex ? "bg-accent text-accent-foreground" : "",
            )}
            key={`${query}-${index}`}
            onClick={() => selectItem(index)}
          >
            {item.type === "ens" ? (
              <AccountSuggestion
                address={item.address}
                name={item.name}
                avatarUrl={item.avatarUrl}
                handle={item.name}
              />
            ) : null}
            {item.type === "farcaster" ? (
              <AccountSuggestion
                address={item.address}
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
    <div className="flex flex-col z-50 min-w-[8rem] max-h-[250px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md suggestions-scrollbar">
      {children}
    </div>
  );
});

type AccountSuggestionProps = {
  address: Hex;
  avatarUrl: string | null | undefined;
  name: string;
  handle: string;
};

function AccountSuggestion({
  address,
  avatarUrl,
  name,
  handle,
}: AccountSuggestionProps) {
  return (
    <div className="flex flex-row items-center gap-2 w-full min-w-0">
      <div
        className="rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0"
        style={{
          backgroundImage: `url(${avatarUrl || `https://effigy.im/a/${address}`})`,
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
  suggestion: Erc20MentionSuggestion;
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
