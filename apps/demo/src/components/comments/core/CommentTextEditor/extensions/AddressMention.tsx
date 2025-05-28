import { Mention, MentionOptions } from "@tiptap/extension-mention";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Hex } from "viem";
import type { EnsResolverService } from "./types";

type AddressSuggestionItem = {
  id: string;
  label: string;
};

type AddressItem = {
  id: string;
  label: string;
};

type AddressMentionExtensionOptions = MentionOptions<
  AddressSuggestionItem,
  AddressItem
> & {
  ensResolver: EnsResolverService | null;
};

export const AddressMentionExtension =
  Mention.extend<AddressMentionExtensionOptions>({
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
      console.log("renderText", this.options, node);
      return `${this.options.suggestion.char}${node.attrs.label ?? node.attrs.id}`;
    },
    addOptions() {
      const parent = this.parent?.();

      return {
        ...parent,
        ensResolver: null as EnsResolverService | null,
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
          find: /(?:^|\s)(@0x[a-fA-F0-9]{40})(\s)$/,
          handler: ({ state, match, range }) => {
            const address = match[1].slice(1) as Hex;
            const hasSpace = !!match[2];

            const node = mentionType.create({
              id: address,
              label: address,
              resolved: false,
            });

            const tr = state.tr;
            tr.replaceWith(range.from, range.to, node);

            if (hasSpace) {
              tr.insert(range.from + 1, state.schema.text(" "));
            }

            state.apply(tr);
          },
        },
        {
          find: /(?:^|\s)(@[a-z0-9-]+\.eth)(\s)$/,
          handler: ({ state, match, range }) => {
            const name = match[1].slice(1);
            const hasSpace = !!match[2];

            const node = mentionType.create({
              id: name,
              label: name,
              resolved: false,
            });

            const tr = state.tr;
            tr.replaceWith(range.from, range.to, node);

            if (hasSpace) {
              tr.insert(range.from + 1, state.schema.text(" "));
            }

            state.apply(tr);
          },
        },
      ];
    },

    addProseMirrorPlugins() {
      const mentionType = this.type;
      const ensService = this.options.ensResolver;
      const pluginKey = new PluginKey("address-mention-resolver");

      let editorView: EditorView | null = null;

      return [
        new Plugin({
          key: pluginKey,

          view: (view) => {
            editorView = view;
            return {
              update: (view) => {
                // Check for mentions in the document and resolve them
                const doc = view.state.doc;

                doc.descendants((node, pos) => {
                  if (node.type === mentionType && !node.attrs.resolved) {
                    const id = node.attrs.id;

                    if (id && ensService) {
                      if (id.startsWith("0x")) {
                        ensService
                          .resolveAddress(id as Hex)
                          .then((resolution) => {
                            if (resolution && editorView) {
                              const tr = view.state.tr;

                              tr.setNodeMarkup(pos, mentionType, {
                                id: resolution.address,
                                label: resolution.label,
                                // prevent infinite update loop
                                resolved: true,
                              });

                              editorView.dispatch(tr);
                            }
                          });
                      } else if (id.endsWith(".eth")) {
                        ensService.resolveName(id).then((resolution) => {
                          if (resolution && editorView) {
                            const tr = view.state.tr;

                            tr.setNodeMarkup(pos, mentionType, {
                              id: resolution.address,
                              label: resolution.label,
                              // prevent infinite update loop
                              resolved: true,
                            });

                            editorView.dispatch(tr);
                          }
                        });
                      }
                    }
                  }

                  return true;
                });
              },
              destroy: () => {
                editorView = null;
              },
            };
          },

          props: {
            handlePaste: (view, event) => {
              const text = event.clipboardData?.getData("text/plain");
              if (!text) return false;

              // Find all Ethereum addresses and ENS names in the pasted text
              const addressRegex = /(@0x[a-fA-F0-9]{40})|(@[a-z0-9-]+\.eth)/g;
              let match;
              const tr = view.state.tr;
              const insertPos = view.state.selection.from;

              // First insert the full text
              tr.insertText(text, insertPos);

              // Then find and replace all matches
              const offset = insertPos;
              const updates: Promise<void>[] = [];

              while ((match = addressRegex.exec(text)) !== null) {
                const matchStart = match.index;
                const fullMatch = match[0];
                const address = fullMatch.slice(1); // Remove the @ from the match
                const isEns = address.endsWith(".eth");

                // Calculate the actual position in the document
                const from = offset + matchStart;
                const to = from + fullMatch.length;

                // Create initial node
                const node = mentionType.create({
                  id: address,
                  label: address,
                });

                tr.replaceWith(from, to, node);

                // Queue async resolution
                if (ensService) {
                  const updatePromise = (
                    isEns
                      ? ensService.resolveName(address)
                      : ensService.resolveAddress(address as Hex)
                  ).then((resolution) => {
                    if (resolution) {
                      const updateTr = view.state.tr;
                      updateTr.setNodeMarkup(from, mentionType, {
                        id: resolution.address,
                        label: resolution.label,
                      });
                      view.dispatch(updateTr);
                    }
                  });
                  updates.push(updatePromise);
                }
              }

              // Dispatch the initial transaction
              view.dispatch(tr);

              // Handle all async updates
              Promise.all(updates).catch(console.error);

              return true;
            },
          },
        }),
      ];
    },
  });
