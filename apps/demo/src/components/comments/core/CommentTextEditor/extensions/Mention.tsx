import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { Attribute, ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import type {
  MentionSuggestionsResponseSchemaType,
  MentionSuggestionSchemaType,
} from "@/app/api/mention-suggestions/route";
import {
  Suggestions,
  type SuggestionsRef,
  type SuggestionsProps,
} from "./components/Suggestions";

const MINIMUM_QUERY_LENGTH = 2;

export type MentionItem = MentionSuggestionSchemaType;

type SuggestionItem = MentionSuggestionSchemaType;

type MentionExtensionOptions = MentionOptions<SuggestionItem, MentionItem> & {
  searchSuggestions: (
    query: string,
  ) => Promise<MentionSuggestionsResponseSchemaType>;
};

export type MentionItemKeys =
  | keyof Extract<MentionItem, { type: "ens" }>
  | keyof Extract<MentionItem, { type: "erc20" }>
  | keyof Extract<MentionItem, { type: "farcaster" }>;

type MentionAttributes = {
  [K in MentionItemKeys]: Attribute;
};

export const MentionExtension = Mention.extend<MentionExtensionOptions>({
  addAttributes() {
    /**
     * Some properties use undefined as default value to indicate that the property is not present in the node.
     * This is necessary so editor.getJSON() returns the correct value that equals to provided default value if JSON.stringify() is used.
     */
    return {
      address: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-address"),
        renderHTML: (attributes) => {
          return {
            "data-address": attributes.address,
          };
        },
      },
      avatarUrl: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-avatar-url"),
        renderHTML: (attributes) => {
          return {
            "data-avatar-url": attributes.avatarUrl,
          };
        },
      },
      caip19: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-caip19"),
        renderHTML: (attributes) => {
          return {
            "data-caip19": attributes.caip19,
          };
        },
      },
      fid: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-fid"),
        renderHTML: (attributes) => {
          return {
            "data-fid": attributes.fid,
          };
        },
      },
      fname: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-fname"),
        renderHTML: (attributes) => {
          return {
            "data-fname": attributes.fname,
          };
        },
      },
      chainId: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-chain-id"),
        renderHTML: (attributes) => {
          return {
            "data-chain-id": attributes.chainId,
          };
        },
      },
      username: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-username"),
        renderHTML: (attributes) => {
          return {
            "data-username": attributes.username,
          };
        },
      },
      displayName: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-display-name"),
        renderHTML: (attributes) => {
          return {
            "data-display-name": attributes.displayName,
          };
        },
      },
      name: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) => {
          return {
            "data-name": attributes.name,
          };
        },
      },
      pfpUrl: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-pfp-url"),
        renderHTML: (attributes) => {
          return {
            "data-pfp-url": attributes.pfpUrl,
          };
        },
      },
      url: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-url"),
        renderHTML: (attributes) => {
          return {
            "data-url": attributes.url,
          };
        },
      },
      symbol: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-symbol"),
        renderHTML: (attributes) => {
          return {
            "data-symbol": attributes.symbol,
          };
        },
      },
      type: {
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
          };
        },
      },
      decimals: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-decimals"),
        renderHTML: (attributes) => {
          return {
            "data-decimals": attributes.decimals,
          };
        },
      },
      logoURI: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-logo-uri"),
        renderHTML: (attributes) => {
          return {
            "data-logo-uri": attributes.logoURI,
          };
        },
      },
    } satisfies MentionAttributes;
  },
  renderText({ node }) {
    const attrs = node.attrs as MentionItem;

    // in case of erc20 token render caip19
    if (attrs.type === "erc20") {
      return attrs.caip19;
    }

    // for ens name, farcaster username or just address render address prefixed with mention
    return `@${attrs.address}`;
  },
  renderHTML({ node }) {
    const attrs = node.attrs as MentionItem;

    switch (attrs.type) {
      case "ens": {
        return [
          "span",
          {
            class: "text-blue-500",
            "data-type": attrs.type,
            "data-name": attrs.name,
            "data-address": attrs.address,
          },
          `@${attrs.name}`,
        ];
      }
      case "erc20": {
        return [
          "span",
          {
            class: "text-blue-500",
            "data-type": attrs.type,
            "data-name": attrs.name,
            "data-address": attrs.address,
            "data-symbol": attrs.symbol,
          },
          `$${attrs.symbol}`,
        ];
      }
      default: {
        // farcaster
        return [
          "span",
          {
            class: "text-blue-500",
            "data-type": attrs.type,
            "data-address": attrs.address,
            "data-name": attrs.username || attrs.displayName || attrs.address,
          },
          `@${attrs.fname}`,
        ];
      }
    }
  },
  addOptions() {
    const parent = this.parent?.();

    return {
      ...parent,
      async searchSuggestions() {
        return {
          suggestions: [],
        };
      },
      suggestion: {
        ...parent?.suggestion,
        char: "@",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
            ])
            .run();
        },
        items() {
          return [];
        },
        render: () => {
          let reactRenderer: ReactRenderer<SuggestionsRef, SuggestionsProps>;
          let popup: Instance;

          return {
            onStart: (props) => {
              const clientRect = props.clientRect?.();

              if (!clientRect) {
                return;
              }

              reactRenderer = new ReactRenderer(Suggestions, {
                props: {
                  ...props,
                  minimumQueryLength: MINIMUM_QUERY_LENGTH,
                },
                editor: props.editor,
              });

              popup = tippy(document.body, {
                getReferenceClientRect: () => clientRect,
                appendTo: () => document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props) {
              reactRenderer?.updateProps(props);

              const clientRect = props.clientRect?.();

              if (!clientRect) {
                return;
              }

              popup?.setProps({
                getReferenceClientRect: () => clientRect,
              });
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.hide();

                return true;
              }

              return reactRenderer?.ref?.onKeyDown(props) || false;
            },

            onExit() {
              popup?.destroy();
              reactRenderer?.destroy();
            },
          };
        },
      },
    };
  },

  onBeforeCreate() {
    this.options.suggestion.items = async ({ query }) => {
      if (query.trim().length < MINIMUM_QUERY_LENGTH) {
        return [];
      }

      const { suggestions } = await this.options.searchSuggestions(query);

      return suggestions;
    };
  },
});
