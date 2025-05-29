import { Mention, MentionOptions } from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Hex } from "viem";
import type { EnsResolverService } from "./types";
import type { Node, NodeType } from "prosemirror-model";

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

type AddressMentionExtensionOptions = MentionOptions<
  AddressItem,
  AddressItem
> & {
  ensResolver: EnsResolverService;
};

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
          parseHTML: () => false,
          renderHTML: () => null, // Don't render this to HTML
        },
      };
    },
    renderText({ node }) {
      return `${this.options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
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
          command: () => {},
          pluginKey: new PluginKey("address-mention"),
          items() {
            return [];
          },

          render: () => {
            return {
              onStart: () => {},

              onUpdate() {},

              onKeyDown() {
                return false;
              },

              onExit() {},
            };
          },
        },
      };
    },

    addInputRules() {
      const mentionType = this.type;

      return [
        {
          find: /(?:^|\s)(@0x[a-fA-F0-9]{40})\s$/,
          handler: ({ state, match, range }) => {
            const address = match[1].slice(1) as Hex;

            const node = mentionType.create({
              id: address,
              label: address,
              resolved: false,
            } satisfies AddressItem);

            const tr = state.tr;

            tr.replaceWith(range.from, range.to, [
              node,
              state.schema.text(" "),
            ]);

            state.apply(tr);
          },
        },
        {
          find: /(?:^|\s)(@[a-z0-9-]+\.eth)\s$/,
          handler: ({ state, match, range }) => {
            const name = match[1].slice(1);

            const node = mentionType.create({
              id: name,
              label: name,
              resolved: false,
            } satisfies AddressItem);

            const tr = state.tr;

            tr.replaceWith(range.from, range.to, [
              node,
              state.schema.text(" "),
            ]);

            state.apply(tr);
          },
        },
      ];
    },

    addProseMirrorPlugins() {
      return [
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
