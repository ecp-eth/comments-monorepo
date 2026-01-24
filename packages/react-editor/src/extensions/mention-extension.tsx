import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { Attribute, mergeAttributes, ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import {
  Suggestions,
  type SuggestionsRef,
  type SuggestionsProps,
} from "./components/suggestions.js";
import { isValidQuery } from "./helpers.js";
import type {
  MentionItem,
  MentionItemKeys,
  MentionsExtensionTheme,
  UploadTrackerFileComponent,
  UploadTrackerImageComponent,
  UploadTrackerVideoComponent,
} from "./types.js";
import type { SearchSuggestionsFunction } from "./types.js";
import { MINIMUM_QUERY_LENGTH } from "../constants.js";
import { DOMOutputSpec } from "prosemirror-model";

type SuggestionItem = MentionItem;

type MentionAttributes = {
  [K in MentionItemKeys]: Attribute;
};

type MentionExtensionOptions = MentionOptions<SuggestionItem, MentionItem> & {
  searchSuggestions: SearchSuggestionsFunction;
  imageComponent: UploadTrackerImageComponent;
  videoComponent: UploadTrackerVideoComponent;
  fileComponent: UploadTrackerFileComponent;
  theme?: MentionsExtensionTheme;
  mentionSuggestionRenderer?: () => MentionOptions<
    SuggestionItem,
    MentionItem
  >["suggestion"]["render"];
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
      value: {
        default: undefined,
        parseHTML: (element) => element.getAttribute("data-value"),
        renderHTML: (attributes) => {
          return {
            "data-value": attributes.value,
          };
        },
      },
    } satisfies MentionAttributes;
  },
  renderText({ node }) {
    const attrs = node.attrs as MentionItem;

    switch (attrs.type) {
      case "erc20":
        // erc20 token as caip19
        return attrs.caip19;
      case "ens":
        return `@${attrs.name}`;
      case "farcaster":
        return `@${attrs.fname}`;
      default:
        attrs satisfies never;
        throw new Error("Invalid type");
    }
  },
  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as MentionItem;

    switch (attrs.type) {
      case "ens": {
        return [
          "span",
          mergeAttributes(
            {
              class: "text-blue-500",
            },
            HTMLAttributes,
          ),
          `@${attrs.name}`,
        ];
      }
      case "erc20": {
        return [
          "span",
          mergeAttributes(
            {
              class: "text-blue-500",
            },
            HTMLAttributes,
          ),
          `$${attrs.symbol}`,
        ];
      }
      default: {
        // farcaster
        return [
          "span",
          mergeAttributes(
            {
              class: "text-blue-500",
            },
            HTMLAttributes,
          ),
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
          results: [],
        };
      },
      suggestion: {
        ...parent?.suggestion,
        char: "@",
        startOfLine: false,
        command: ({ editor, range, props }) => {
          // Check if there's already a space after the insertion point
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(" ") ?? false;

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();
        },
        items() {
          return [];
        },
      },
    };
  },

  onBeforeCreate() {
    const char = this.options.suggestion.char;

    if (char !== "$" && char !== "@") {
      throw new Error("Invalid char, only @ and $ are allowed");
    }

    this.options.suggestion.items = async ({ query }) => {
      if (!isValidQuery(query, MINIMUM_QUERY_LENGTH)) {
        return [];
      }

      const { results } = await this.options.searchSuggestions(query, char);

      return results;
    };

    const mentionSuggestionRenderer = this.options.mentionSuggestionRenderer;

    this.options.suggestion.render = mentionSuggestionRenderer
      ? mentionSuggestionRenderer()
      : webSuggestionsRenderer(this.options.theme);
  },
});

const webSuggestionsRenderer =
  (
    mentionExtensionTheme?: MentionsExtensionTheme,
  ): MentionOptions<SuggestionItem, MentionItem>["suggestion"]["render"] =>
  () => {
    let reactRenderer: ReactRenderer<SuggestionsRef, SuggestionsProps>;
    let popup: Instance;
    let scrollListener: (() => void) | undefined;

    return {
      onStart: (props) => {
        const clientRect = props.clientRect?.();

        if (!clientRect) {
          return;
        }

        reactRenderer = new ReactRenderer(Suggestions, {
          props: {
            ...props,
            theme: mentionExtensionTheme,
          },
          editor: props.editor,
        });

        popup = tippy(document.body, {
          getReferenceClientRect: () => props.clientRect?.() ?? clientRect,
          appendTo: document.body,
          content: reactRenderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          popperOptions: {
            modifiers: [
              {
                name: "offset",
                options: {
                  offset: [0, 8],
                },
              },
              {
                name: "preventOverflow",
                options: {
                  boundary: "viewport",
                  padding: 16,
                  altBoundary: false,
                },
              },
              {
                name: "flip",
                options: {
                  fallbackPlacements: ["top-start", "bottom-end", "top-end"],
                  padding: 16,
                },
              },
            ],
          },
        });

        scrollListener = () => {
          if (popup) {
            popup.setProps({
              getReferenceClientRect: () => props.clientRect?.() ?? clientRect,
            });
          }
        };

        window.addEventListener("scroll", scrollListener);
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

        if (!popup?.state.isShown) {
          if (
            props.event.key === "ArrowUp" ||
            props.event.key === "ArrowDown"
          ) {
            popup?.show();

            return true;
          }

          // make sure that we won't select a last selected suggestion if popup is not shown
          return false;
        }

        return reactRenderer?.ref?.onKeyDown(props) || false;
      },

      onExit() {
        // avoid warnings
        if (popup) {
          popup.destroy();
        }

        if (reactRenderer) {
          reactRenderer.destroy();
        }

        if (scrollListener) {
          window.removeEventListener("scroll", scrollListener);
        }
      },
    };
  };
