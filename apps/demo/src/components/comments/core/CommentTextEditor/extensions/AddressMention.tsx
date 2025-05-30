import { Mention, MentionOptions } from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Hex } from "viem";
import type { Node, NodeType } from "prosemirror-model";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Suggestion, { SuggestionProps } from "@tiptap/suggestion";
import { EnsResolverService } from "../hooks/useEnsResolver";

export type AddressItem =
  | {
      /**
       * Hex
       */
      id: Hex;
      /**
       * Hex or ENS name
       */
      label: string;
      resolved: true;
    }
  | {
      /**
       * Hex or ENS name
       */
      id: string | Hex;
      /**
       * Hex or ENS name
       */
      label: string | Hex;
      resolved: false;
    };

type AddressSuggestionItem = {
  id: Hex;
  /**
   * Hex or ENS name
   */
  label: string | Hex;
};

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

  if (!query) {
    return null;
  }

  return (
    <div className="dropdown-menu">
      {items.length ? (
        items.map((address, index) => (
          <button
            className={`flex items-center gap-2 w-full p-2 ${
              index === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            key={address.id}
            onClick={() => selectItem(index)}
          >
            <span>{address.label}</span>
          </button>
        ))
      ) : (
        <div className="item">Invalid address</div>
      )}
    </div>
  );
});

AddressSuggestions.displayName = "AddressSuggestions";

type AddressMentionExtensionOptions = MentionOptions<
  AddressSuggestionItem,
  AddressItem
> & {
  ensResolver: EnsResolverService;
};

const pluginKey = new PluginKey("address-mention");

export const AddressMentionExtension =
  Mention.extend<AddressMentionExtensionOptions>({
    name: "addressMention",
    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-id"),
          renderHTML: (attributes) => {
            return {
              "data-id": attributes.id,
            };
          },
        },
        label: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-label"),
          renderHTML: (attributes) => {
            return {
              "data-label": attributes.label,
            };
          },
        },
        resolved: {
          // Add this new attribute
          default: false,
          parseHTML: (element) =>
            element.getAttribute("data-resolved") === "true",
          renderHTML: (attributes) => {
            return {
              "data-resolved": attributes.resolved,
            };
          },
        },
      };
    },
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`;
    },
    addOptions() {
      const parent = this.parent?.();

      return {
        ...parent,
        ensResolver: {
          resolveAddress() {
            return Promise.resolve(null);
          },
          resolveName() {
            return Promise.resolve(null);
          },
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
                  attrs: {
                    resolved: true,
                    id: props.id as Hex,
                    label: props.label,
                  } satisfies AddressItem,
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
        if (!query) {
          return [];
        }

        if (query.endsWith(".eth")) {
          const resolved = await this.options.ensResolver.resolveName(query);

          if (!resolved) {
            // invalid ens name
            return [];
          }

          return [
            {
              id: resolved.address,
              label: resolved.label,
            },
          ];
        }

        if (query.match(/^0x[a-fA-F0-9]{40}$/)) {
          const resolved = await this.options.ensResolver.resolveAddress(
            query as Hex,
          );

          if (!resolved) {
            return [
              {
                id: query as Hex,
                label: query,
              },
            ];
          }

          return [
            {
              id: resolved.address,
              label: resolved.label,
            },
          ];
        }

        // invalid input
        return [];
      };
    },

    // we probably don't need input rules because the suggestions are handled as you type
    // and if content is loaded from source it is already parsed and resolved
    /* addInputRules() {
      const mentionType = this.type;

      return [
        {
          find: /(?<=^|\s)(?:@)(0x[a-fA-F0-9]{40})([^\w\d])?$/,
          handler: ({ state, match, range }) => {
            const [, address, trailingChar] = match;

            const node = mentionType.create({
              id: address,
              label: address,
              resolved: false,
            } satisfies AddressItem);

            const tr = state.tr;

            const replacement = [node];

            if (trailingChar) {
              replacement.push(state.schema.text(trailingChar));
            }

            tr.replaceWith(range.from, range.to, replacement);

            state.apply(tr);
          },
        },
        {
          find: /(?<=^|\s)(?:@)([a-z0-9-]+\.eth)([^\w\d])?$/,
          handler: ({ state, match, range }) => {
            const [, name, trailingChar] = match;

            const node = mentionType.create({
              id: name,
              label: name,
              resolved: false,
            } satisfies AddressItem);

            const tr = state.tr;

            const replacement = [node];

            if (trailingChar) {
              replacement.push(state.schema.text(trailingChar));
            }

            tr.replaceWith(range.from, range.to, replacement);

            state.apply(tr);
          },
        },
      ];
    },*/

    addProseMirrorPlugins() {
      return [
        Suggestion({
          ...this.options.suggestion,
          editor: this.editor,
        }),
        new AddressMentionResolverPlugin({
          ensResolver: this.options.ensResolver,
          nodeType: this.type,
        }),
      ];
    },
  });

type AddressMentionResolverPluginOptions = {
  ensResolver: EnsResolverService;
  nodeType: NodeType;
};

const addressMentionResolverPluginKey = new PluginKey(
  "address-mention-resolver",
);

class AddressMentionResolverPlugin extends Plugin {
  constructor({ ensResolver, nodeType }: AddressMentionResolverPluginOptions) {
    let editorView: EditorView | null = null;

    super({
      key: addressMentionResolverPluginKey,
      view: (view) => {
        editorView = view;

        return {
          update: (view) => {
            // Check for mentions in the document and resolve them
            const doc = view.state.doc;

            doc.descendants((node, pos) => {
              const attributes = getAddressMentionNodeAttributes(
                node,
                nodeType,
              );

              if (!attributes || attributes.resolved) {
                return true;
              }

              if (attributes.id.startsWith("0x")) {
                ensResolver
                  .resolveAddress(attributes.id as Hex)
                  .then((resolution) => {
                    if (resolution && editorView) {
                      const tr = view.state.tr;

                      tr.setNodeMarkup(pos, nodeType, {
                        id: resolution.address,
                        label: resolution.label,
                        // prevent infinite update loop
                        resolved: true,
                      });

                      editorView.dispatch(tr);
                    }
                  });
              } else if (attributes.id.endsWith(".eth")) {
                ensResolver.resolveName(attributes.id).then((resolution) => {
                  if (resolution && editorView) {
                    const tr = view.state.tr;

                    tr.setNodeMarkup(pos, nodeType, {
                      id: resolution.address,
                      label: resolution.label,
                      // prevent infinite update loop
                      resolved: true,
                    });

                    editorView.dispatch(tr);
                  }
                });
              }

              return true;
            });
          },
          destroy: () => {
            editorView = null;
          },
        };
      },
    });
  }
}

function getAddressMentionNodeAttributes(
  node: Node,
  expectedNodeType: NodeType,
): AddressItem | null {
  if (node.type !== expectedNodeType) {
    return null;
  }

  return node.attrs as AddressItem;
}
