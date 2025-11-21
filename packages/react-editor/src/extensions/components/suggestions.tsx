import { isValidQuery } from "../helpers.js";
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
import type { MentionItem, MentionsExtensionTheme } from "../types.js";
import type { IndexerAPIAutocompleteERC20SchemaType } from "@ecp.eth/sdk/indexer";
import { MINIMUM_QUERY_LENGTH } from "../../constants.js";

export type SuggestionsProps = SuggestionProps<MentionItem> & {
  theme?: MentionsExtensionTheme;
};

export type SuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const Suggestions = forwardRef(function Suggestions(
  { command, items, query, theme }: SuggestionsProps,
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

  if (!isValidQuery(query, MINIMUM_QUERY_LENGTH)) {
    return null;
  } else if (items.length === 0) {
    children = (
      <div
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
          theme?.suggestionsNoResultsClassName,
        )}
      >
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
              theme?.suggestionsItemClassName,
              index === selectedIndex
                ? cn(
                    "bg-accent text-accent-foreground",
                    theme?.suggestionsItemSelectedClassName,
                  )
                : "",
            )}
            key={`${query}-${index}`}
            onClick={() => selectItem(index)}
          >
            {item.type === "ens" ? (
              <AccountSuggestion
                className={theme?.suggestionsItemClassName}
                avatarClassName={theme?.suggestionsItemAvatarClassName}
                nameClassName={theme?.suggestionsItemNameClassName}
                handleClassName={theme?.suggestionsItemHandleClassName}
                infoClassName={theme?.suggestionsItemInfoClassName}
                address={item.address}
                name={item.name}
                avatarUrl={item.avatarUrl}
                handle={item.name}
              />
            ) : null}
            {item.type === "farcaster" ? (
              <AccountSuggestion
                className={theme?.suggestionsItemClassName}
                avatarClassName={theme?.suggestionsItemAvatarClassName}
                nameClassName={theme?.suggestionsItemNameClassName}
                handleClassName={theme?.suggestionsItemHandleClassName}
                infoClassName={theme?.suggestionsItemInfoClassName}
                address={item.address}
                avatarUrl={item.pfpUrl}
                name={item.displayName || item.username}
                handle={item.fname}
              />
            ) : null}
            {item.type === "erc20" ? (
              <ERC20TokenSuggestion
                suggestion={item}
                className={theme?.suggestionsItemClassName}
                avatarClassName={theme?.suggestionsItemAvatarClassName}
                symbolClassName={theme?.suggestionsItemSymbolClassName}
                infoClassName={theme?.suggestionsItemInfoClassName}
              />
            ) : null}
          </button>
        ))}
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col z-50 min-w-[8rem] max-h-[250px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md suggestions-scrollbar",
        theme?.suggestionsClassName,
      )}
    >
      {children}
    </div>
  );
});

type AccountSuggestionProps = {
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  handleClassName?: string;
  infoClassName?: string;
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
  className,
  avatarClassName,
  nameClassName,
  handleClassName,
  infoClassName,
}: AccountSuggestionProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2 w-full min-w-0",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0",
          avatarClassName,
        )}
        style={{
          backgroundImage: `url(${avatarUrl || `https://effigy.im/a/${address}`})`,
        }}
      ></div>
      <div className={cn("flex flex-col min-w-0 flex-1", infoClassName)}>
        <span
          className={cn("text-sm truncate w-full text-left", nameClassName)}
        >
          {name}
        </span>
        <span
          className={cn(
            "text-sm text-muted-foreground truncate w-full text-left",
            handleClassName,
          )}
        >
          {handle}
        </span>
      </div>
    </div>
  );
}

type ERC20TokenSuggestionProps = {
  suggestion: IndexerAPIAutocompleteERC20SchemaType;
  className?: string;
  avatarClassName?: string;
  symbolClassName?: string;
  infoClassName?: string;
  chainClassName?: string;
};

function ERC20TokenSuggestion({
  suggestion,
  className,
  avatarClassName,
  symbolClassName,
  infoClassName,
  chainClassName,
}: ERC20TokenSuggestionProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2 w-full min-w-0",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0",
          avatarClassName,
        )}
        style={{
          backgroundImage: suggestion.logoURI
            ? `url(${suggestion.logoURI})`
            : undefined,
        }}
      ></div>
      <div className={cn("flex flex-col min-w-0 flex-1", infoClassName)}>
        <span
          className={cn("text-sm truncate w-full text-left", symbolClassName)}
        >
          ${suggestion.symbol}
        </span>
        <span
          className={cn(
            "text-sm text-muted-foreground truncate w-full text-left",
            chainClassName,
          )}
        >
          {getChainById(suggestion.chainId, Object.values(chains))?.name}
        </span>
      </div>
    </div>
  );
}
