import { visit } from "unist-util-visit";
import escapeStringRegexp from "escape-string-regexp";

/**
 * A remark plugin that finds and replaces text in the markdown AST.
 */
export default function remarkFindAndReplace({
  replacements = {},
  prefix = "%",
}: {
  replacements: Record<string, string>;
  prefix: string;
}) {
  // Attaches prefix to the start of the string.
  const attachPrefix = (str: string) => (prefix || "") + str;

  // Removes prefix from the start of the string.
  const stripPrefix = (str: string) =>
    prefix ? str.replace(RegExp(`^${prefix}`), "") : str;

  // RegExp to find any replacement keys.
  const regexp = RegExp(
    "(" +
      Object.keys(replacements)
        .map((key) => escapeStringRegexp(attachPrefix(key)))
        .join("|") +
      ")",
    "g",
  );

  const replacer = (_match: any, name: string) =>
    replacements[stripPrefix(name)];

  return (tree: any) => {
    // Go through all text, html, code, inline code, and links.
    visit(tree, ["text", "html", "code", "inlineCode", "link"], (node) => {
      if (node.type === "link") {
        // For links, the text value is replaced by text node, so we change the
        // URL value.
        const processedText = node.url.replace(regexp, replacer);
        node.url = processedText;
      } else {
        // For all other nodes, replace the node value.
        const processedText = node.value.replace(regexp, replacer);
        node.value = processedText;
      }
    });

    return tree;
  };
}
