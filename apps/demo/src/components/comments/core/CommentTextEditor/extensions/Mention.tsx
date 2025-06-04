import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
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

export type MentionItem = MentionSuggestionSchemaType;

type SuggestionItem = MentionSuggestionSchemaType;

type MentionExtensionOptions = MentionOptions<SuggestionItem, MentionItem> & {
  searchSuggestions: (
    query: string,
  ) => Promise<MentionSuggestionsResponseSchemaType>;
};

export const MentionExtension = Mention.extend<MentionExtensionOptions>({
  addAttributes() {
    return {
      address: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-address"),
        renderHTML: (attributes) => {
          return {
            "data-address": attributes.address,
          };
        },
      },
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) => {
          return {
            "data-name": attributes.name,
          };
        },
      },
      symbol: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-symbol"),
        renderHTML: (attributes) => {
          return {
            "data-symbol": attributes.symbol,
          };
        },
      },
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => {
          return {
            "data-type": attributes.type,
          };
        },
      },
    };
  },
  renderText({ node }) {
    const attrs = node.attrs as MentionItem;

    // render address so we can easily resolve it in indexer
    return attrs.address;
  },
  renderHTML({ node }) {
    const attrs = node.attrs as MentionItem;

    if (attrs.type === "ens") {
      return [
        "span",
        {
          "data-type": attrs.type,
          "data-name": attrs.name,
          "data-address": attrs.address,
          class: "mention font-medium",
        },
        `@${attrs.name}`,
      ];
    }

    return [
      "span",
      {
        "data-type": attrs.type,
        "data-name": attrs.name,
        "data-address": attrs.address,
        "data-symbol": attrs.symbol,
        class: "mention font-medium",
      },
      `$${attrs.symbol || attrs.name || attrs.address}`,
    ];
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
                props,
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
      if (query.trim().length < 3) {
        return [];
      }

      const { suggestions } = await this.options.searchSuggestions(query);

      return suggestions;
    };
  },
});
