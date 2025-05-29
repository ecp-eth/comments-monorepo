import { Mention, MentionOptions } from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, type SuggestionProps } from "@tiptap/suggestion";
import tippy, { Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { PluginKey } from "prosemirror-state";
import type { Token, TokenResolverService } from "../hooks/useTokenResolver";
import { Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Node, NodeType } from "prosemirror-model";

export type TokenMentionSuggestionsRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export type TokenItem =
  | {
      type: "resolved";
      /**
       * CAIP-19
       */
      id: string;
      label: string;
    }
  | {
      type: "unresolved-symbol";
      symbol: string;
    }
  | {
      type: "unresolved-caip19";
      caip19: string;
    };

type TokenSuggestionItem = Token;

type TokenMentionOptions = MentionOptions<Token, Token> & {
  tokenResolver: TokenResolverService;
};

type TokenSuggestionsProps = SuggestionProps<TokenSuggestionItem>;

export const TokenSuggestions = forwardRef<
  TokenMentionSuggestionsRef,
  TokenSuggestionsProps
>(({ command, items }, ref) => {
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

  return (
    <div className="dropdown-menu">
      {items.length ? (
        items.map((token, index) => (
          <button
            className={`flex items-center gap-2 w-full p-2 ${
              index === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            key={token.address}
            onClick={() => selectItem(index)}
          >
            <img
              src={token.logoURI ?? undefined}
              alt={token.symbol ?? token.name ?? token.caip19}
              className="w-5 h-5 rounded-full"
              width={20}
              height={20}
            />
            <span>{token.symbol || token.name}</span>
          </button>
        ))
      ) : (
        <div className="item">No tokens found</div>
      )}
    </div>
  );
});

TokenSuggestions.displayName = "TokenSuggestions";

const pluginKey = new PluginKey("token-mention");

export const TokenMentionExtension = Mention.extend<TokenMentionOptions>({
  name: "tokenMention",
  addAttributes() {
    return {
      type: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-type"),
        renderHTML: (attributes) => ({
          "data-type": attributes.type,
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      symbol: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-symbol"),
        renderHTML: (attributes) => ({
          "data-symbol": attributes.symbol,
        }),
      },
      caip19: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-caip19"),
        renderHTML: (attributes) => ({
          "data-caip19": attributes.caip19,
        }),
      },
    };
  },

  renderText({ node }) {
    return `$${node.attrs.label ?? node.attrs.id}`;
  },

  addOptions() {
    const parent = this.parent?.();

    return {
      ...parent,
      tokenResolver: {
        resolverCaip19(caip19) {
          return Promise.resolve(null);
        },
        resolveSymbol(symbol) {
          return Promise.resolve(null);
        },
        searchTokens: async () => [],
      },
      suggestion: {
        char: "$",
        startOfLine: false,
        pluginKey,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: {
                  type: "resolved",
                  id: props.caip19,
                  label: props.symbol || props.caip19,
                } satisfies TokenItem,
              },
            ])
            .run();
        },
        items: () => {
          return [];
        },
        render: () => {
          let reactRenderer: ReactRenderer<
            TokenMentionSuggestionsRef,
            TokenSuggestionsProps
          >;
          let popup: Instance;

          return {
            onStart: (props) => {
              const clientRect = props.clientRect?.();

              if (!clientRect) {
                return;
              }

              reactRenderer = new ReactRenderer(TokenSuggestions, {
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
    this.options.suggestion.items = ({ query }) => {
      return this.options.tokenResolver.searchTokens(query);
    };
  },

  addInputRules() {
    const nodeType = this.type;

    return [
      {
        find: /\$([A-Z]+)\s$/,
        handler: ({ state, match, range }) => {
          const [, symbol] = match;

          const node = nodeType.create({
            symbol,
            type: "unresolved-symbol",
          } satisfies TokenItem);

          const tr = state.tr;

          tr.replaceWith(range.from, range.to, node);

          tr.insert(range.from + 1, state.schema.text(" "));

          state.apply(tr);
        },
      },
      {
        find: /\$eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})\s$/,
        handler: ({ state, match, range }) => {
          const [, chainId, address] = match;

          const node = nodeType.create({
            caip19: `${chainId}:${address}`,
            type: "unresolved-caip19",
          } satisfies TokenItem);

          const tr = state.tr;

          tr.replaceWith(range.from, range.to, node);
          tr.insert(range.from + 1, state.schema.text(" "));

          state.apply(tr);
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        ...this.options.suggestion,
        editor: this.editor,
      }),
      new TokenResolverPlugin({
        tokenResolver: this.options.tokenResolver,
        nodeType: this.type,
      }),
    ];
  },
});

type TokenResolverPluginOptions = {
  tokenResolver: TokenResolverService;
  nodeType: NodeType;
};

const tokenResolverPluginKey = new PluginKey("token-mention-resolver");

class TokenResolverPlugin extends Plugin {
  constructor({ tokenResolver, nodeType }: TokenResolverPluginOptions) {
    let editorView: EditorView | null = null;

    super({
      key: tokenResolverPluginKey,

      view: (view) => {
        editorView = view;

        return {
          update: (view) => {
            // Check for mentions in the document and resolve them
            const doc = view.state.doc;

            doc.descendants((node, pos) => {
              const attributes = getTokenMentionNodeAttributes(node, nodeType);

              // prevents infinite loop if the node is already resolved
              if (!attributes || attributes.type === "resolved") {
                return true;
              }

              if (attributes.type === "unresolved-symbol") {
                tokenResolver
                  .resolveSymbol(attributes.symbol)
                  .then((resolution) => {
                    if (resolution && editorView) {
                      const tr = view.state.tr;

                      tr.setNodeMarkup(pos, nodeType, {
                        type: "resolved",
                        id: resolution.caip19,
                        label: resolution.symbol || resolution.caip19,
                      } as TokenItem);

                      editorView.dispatch(tr);
                    }
                  });
              } else if (attributes.type === "unresolved-caip19") {
                tokenResolver
                  .resolverCaip19(attributes.caip19)
                  .then((resolution) => {
                    if (resolution && editorView) {
                      const tr = view.state.tr;

                      tr.setNodeMarkup(pos, nodeType, {
                        type: "resolved",
                        id: resolution.caip19,
                        label: resolution.symbol || resolution.caip19,
                      } as TokenItem);

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

function getTokenMentionNodeAttributes(
  node: Node,
  expectedNodeType: NodeType,
): TokenItem | null {
  if (node.type !== expectedNodeType) {
    return null;
  }

  return node.attrs as TokenItem;
}
