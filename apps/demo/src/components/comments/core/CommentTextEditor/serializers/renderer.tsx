import type { Node } from "prosemirror-model";
import { Fragment } from "react";
import type { AddressItem } from "../extensions/AddressMention";
import type { TokenItem } from "../extensions/TokenMention";

export function renderModel(root: Node): React.ReactNode {
  return renderNode(root);
}

function renderNode(node: Node): React.ReactNode {
  switch (node.type.name) {
    case "doc":
      return renderDoc(node);
    case "paragraph":
      return renderParagraph(node);
    case "text":
      return renderText(node);
    case "addressMention":
      return renderAddressMention(node);
    case "tokenMention":
      return renderTokenMention(node);
    default:
      throw new Error(`Unknown node type: ${node.type.name}`);
  }
}

function renderDoc(node: Node): React.ReactNode {
  return (
    <>
      {node.children.map((child, index) => (
        <Fragment key={index}>{renderNode(child)}</Fragment>
      ))}
    </>
  );
}

function renderParagraph(node: Node): React.ReactElement {
  return (
    <p>
      {node.children.map((child, index) => (
        <Fragment key={index}>{renderNode(child)}</Fragment>
      ))}
    </p>
  );
}

function renderText(node: Node): React.ReactNode {
  if (node.marks.length > 0) {
    return node.marks.reduce(
      (acc, mark) => {
        switch (mark.type.name) {
          case "bold": {
            return <strong>{acc}</strong>;
          }
          case "italic": {
            return <em>{acc}</em>;
          }
          case "link": {
            return <a {...mark.attrs}>{acc}</a>;
          }
          default:
            console.warn(`Unknown mark type: ${mark.type.name}`);
            return acc;
        }
      },
      <>{node.text}</>,
    );
  }

  return node.text || "";
}

function renderAddressMention(node: Node): React.ReactNode {
  const attrs = node.attrs as AddressItem;

  return <>@{attrs.label}</>;
}

function renderTokenMention(node: Node): React.ReactNode {
  const attrs = node.attrs as TokenItem;

  if (attrs.type === "unresolved-symbol") {
    return <>${attrs.symbol}</>;
  }

  return <>${attrs.type === "resolved" ? attrs.label : attrs.caip19}</>;
}
