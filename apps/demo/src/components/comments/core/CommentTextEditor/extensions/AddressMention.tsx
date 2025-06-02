import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { PluginKey } from "prosemirror-state";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";
import type {
  AddressSuggestionsResponseSchemaType,
  AddressSuggestionSchemaType,
} from "@/app/api/address-suggestions/route";

export type AddressItem = AddressSuggestionSchemaType;

type AddressSuggestionItem = AddressSuggestionSchemaType;

type AddressSuggestionsProps = SuggestionProps<AddressSuggestionItem>;

type AddressSuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const AddressSuggestions = forwardRef<
  AddressSuggestionsRef,
  AddressSuggestionsProps
>(({ command, items, query }, ref) => {
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
            key={item.type + item.address}
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

AddressSuggestions.displayName = "AddressSuggestions";

type AddressMentionExtensionOptions = MentionOptions<
  AddressSuggestionItem,
  AddressItem
> & {
  searchAddressSuggestions: (
    query: string,
  ) => Promise<AddressSuggestionsResponseSchemaType>;
};

const pluginKey = new PluginKey("address-mention");

export const AddressMentionExtension =
  Mention.extend<AddressMentionExtensionOptions>({
    name: "addressMention",
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
      const attrs = node.attrs as AddressItem;

      // render address so we can easily resolve it in indexer
      return attrs.address;
    },
    renderHTML({ node }) {
      const attrs = node.attrs as AddressItem;

      if (attrs.type === "ens") {
        return [
          "span",
          {
            "data-type": attrs.type,
            "data-name": attrs.name,
            "data-address": attrs.address,
            class: "mention font-medium",
          },
          attrs.name,
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
        attrs.symbol || attrs.name,
      ];
    },
    addOptions() {
      const parent = this.parent?.();

      return {
        ...parent,
        async searchAddressSuggestions() {
          return {
            suggestions: [],
          };
        },
        suggestion: {
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
          pluginKey,
          items() {
            return [];
          },

          render: () => {
            let reactRenderer: ReactRenderer<
              AddressSuggestionsRef,
              AddressSuggestionsProps
            >;
            let popup: Instance;

            return {
              onStart: (props) => {
                const clientRect = props.clientRect?.();

                if (!clientRect) {
                  return;
                }

                reactRenderer = new ReactRenderer(AddressSuggestions, {
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

        const { suggestions } =
          await this.options.searchAddressSuggestions(query);

        return suggestions;
      };
    },
  });
