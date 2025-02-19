import React from "react";
import { defineConfig } from "vocs";
import { remarkMermaid } from "@theguild/remark-mermaid";

export default defineConfig({
  title: "Ethereum Comments Protocol",
  description:
    "A decentralized protocol for adding comments to any Ethereum address or transaction",
  logoUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  iconUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  rootDir: ".",
  head: () => {
    return (
      <>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"
        />
      </>
    );
  },
  editLink: {
    pattern:
      "https://github.com/ecp-eth/comments-monorepo/edit/main/docs/pages/:path",
    text: "Edit on GitHub",
  },
  sidebar: [
    {
      text: "Introduction",
      link: "/",
    },
    {
      text: "Getting Started",
      items: [
        {
          text: "Quick Start",
          link: "/quick-start",
        },
        {
          text: "Integration Options",
          link: "/integration-options",
          items: [
            {
              text: "React Component",
              link: "/integration-options/react",
            },
            {
              text: "Contract Interaction",
              link: "/integration-options/contract",
            },
            {
              text: "iFrame (No-code)",
              link: "/integration-options/iframe",
            },
          ],
        },
      ],
    },
    {
      text: "How it works",
      items: [
        {
          text: "Architecture Overview",
          link: "/architecture-overview",
        },
        {
          text: "Dual-signature System",
          link: "/dual-signature-system",
        },
        {
          text: "Post comment flow",
          link: "/post-comment-flow",
        },
        {
          text: "Contract Integration",
          link: "/contract-integration",
        },
      ],
    },
    {
      text: "Resources",
      items: [
        {
          text: "SDK Reference",
          link: "/sdk-reference",
          items: [
            {
              text: "Core Module",
              link: "/sdk-reference/default/",
            },
            {
              text: "React Module",
              link: "/sdk-reference/react/",
            },
          ],
        },
        {
          text: "Protocol Reference",
          link: "/protocol-reference/CommentsV1",
        },
        {
          text: "Demo App Repository",
          link: "https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo",
        },
      ],
    },
    {
      text: "Indexing",
      items: [
        {
          text: "Free Hosted API",
          link: "/api-reference",
        },
        {
          text: "Ponder",
          link: "https://github.com/ecp-eth/comments-monorepo/tree/main/apps/indexer",
        },
        {
          text: "Index Supply",
          link: "/index-supply-integration",
        },
      ],
    },
    {
      text: "FAQ",
      items: [
        {
          text: "Gas Costs",
          link: "/gas-costs",
        },
      ],
    },
    {
      text: "Contact",
      link: "https://t.me/davidfurlong",
    },
  ],
  topNav: [
    { text: "Github", link: "https://github.com/ecp-eth/comments-monorepo" },
  ],
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
});
