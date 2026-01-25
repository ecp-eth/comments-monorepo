import { isValidQuery } from "../helpers.js";
import { cn, getChainById } from "@ecp.eth/shared/helpers";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
  Fragment,
} from "react";
import * as chains from "viem/chains";
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import type { MentionItem, MentionsExtensionTheme } from "../types.js";
import type { IndexerAPIAutocompleteERC20SchemaType } from "@ecp.eth/sdk/indexer";
import { MINIMUM_QUERY_LENGTH } from "../../constants.js";

export type SuggestionsProps = SuggestionProps<MentionItem> & {
  theme?: MentionsExtensionTheme;
  ensRPC?: string;
};

export type SuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const Suggestions = forwardRef(function Suggestions(
  { command, items, query, theme, ensRPC }: SuggestionsProps,
  ref: React.Ref<SuggestionsRef>,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: chains.mainnet,
        transport: http(ensRPC),
      }),
    [ensRPC],
  );

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
    children = (
      <div
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
          theme?.suggestionsContinueTypingClassName,
        )}
      >
        Continue typing to see suggestions
      </div>
    );
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
          <Fragment key={`${query}-${index}`}>
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
                  client={publicClient}
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
                  client={publicClient}
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
            {theme?.suggestionsItemSeparatorClassName &&
              index < items.length - 1 && (
                <div
                  className={cn(
                    "h-px w-full bg-border",
                    theme?.suggestionsItemSeparatorClassName,
                  )}
                />
              )}
          </Fragment>
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

function ImageErrorIcon() {
  return (
    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center relative">
      <div className="absolute w-[15px] h-0.5 bg-red-500 rounded-sm rotate-45" />
      <div className="absolute w-[15px] h-0.5 bg-red-500 rounded-sm -rotate-45" />
    </div>
  );
}

type SuggestionItemProps = {
  className?: string;
  avatarClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  infoClassName?: string;
  address: Hex;
  /**
   * when `source` is not provided, it is considered the source is still being loaded
   * if `source` is provided, but uri is undefined, it is considered "no source" and effigy.im will be used
   */
  source?: {
    uri?: string;
  };
  title: React.ReactNode;
  subtitle: React.ReactNode;
};

function SuggestionItem({
  address,
  source,
  title,
  subtitle,
  className,
  avatarClassName,
  titleClassName,
  subtitleClassName,
  infoClassName,
}: SuggestionItemProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const getEffigyAvatar = useCallback(() => {
    return `https://effigy.im/a/${address}`;
  }, [address]);

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-2 w-full min-w-0",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-cover bg-center size-10 bg-muted border border-border flex-shrink-0 overflow-hidden",
          avatarClassName,
        )}
      >
        {hasImageError ? (
          <ImageErrorIcon />
        ) : source === undefined ? (
          <div className="w-full h-full bg-muted" />
        ) : (
          <img
            src={source.uri ?? getEffigyAvatar()}
            alt=""
            className="w-full h-full object-cover"
            onError={() => {
              setHasImageError(true);
            }}
          />
        )}
      </div>
      <div className={cn("flex flex-col min-w-0 flex-1", infoClassName)}>
        <span
          className={cn("text-sm truncate w-full text-left", titleClassName)}
        >
          {title}
        </span>
        <span
          className={cn(
            "text-sm text-muted-foreground truncate w-full text-left",
            subtitleClassName,
          )}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}

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
  client: PublicClient;
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
  client,
}: AccountSuggestionProps) {
  const [source, setSource] = useState<{
    uri?: string;
  }>();

  useEffect(() => {
    if (avatarUrl) {
      setSource({
        uri: avatarUrl,
      });
      return;
    }

    client
      .getEnsAvatar({ name })
      .then((avatar) => {
        setSource({
          uri: avatar ?? undefined,
        });
      })
      .catch(() => {
        setSource({
          uri: undefined,
        });
      });
  }, [client, avatarUrl, name]);

  return (
    <SuggestionItem
      className={className}
      avatarClassName={avatarClassName}
      titleClassName={nameClassName}
      subtitleClassName={handleClassName}
      infoClassName={infoClassName}
      address={address}
      source={source}
      title={name}
      subtitle={handle}
    />
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
  const chainName =
    getChainById(suggestion.chainId, Object.values(chains))?.name ??
    "Unknown Chain";

  return (
    <SuggestionItem
      className={className}
      avatarClassName={avatarClassName}
      titleClassName={symbolClassName}
      subtitleClassName={chainClassName}
      infoClassName={infoClassName}
      address={suggestion.address}
      source={{
        uri: suggestion.logoURI ?? undefined,
      }}
      title={`$${suggestion.symbol}`}
      subtitle={chainName}
    />
  );
}
