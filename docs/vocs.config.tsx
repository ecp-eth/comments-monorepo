import React from "react";
import { defineConfig } from "vocs";
import { remarkMermaid } from "@theguild/remark-mermaid";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import remarkFindAndReplace from "./plugins/remark-find-replace";

export default defineConfig({
  theme: {
    variables: {
      color: {
        border: {
          light: "#E5E7EB",
          dark: "#374151",
        },
      },
    },
  },
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
      text: "Quick Start",
      link: "/quick-start",
    },

    {
      text: "Integration Options",
      items: [
        {
          text: "Typescript SDK",
          link: "/integration-options/indexer-api",
        },
        {
          text: "React Components",
          link: "/integration-options/react-component-library",
        },
        {
          text: "Iframe Embed (no code)",
          link: "/integration-options/embed-comments",
        },
        {
          text: "Smart Contracts",
          link: "/integration-options/contract-interactions",
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
          text: "Comment Data",
          link: "/comment-data-props",
        },
        {
          text: "Post comment flows",
          link: "/post-comment-flows",
        },
      ],
    },
    {
      text: "Indexing",
      items: [
        {
          text: "Ponder Indexer",
          link: "/indexer-reference/",
          collapsed: true,
          items: [
            {
              text: "Admin CLI",
              link: "/indexer/admin-cli",
            },
            {
              text: "API Key Management",
              link: "/indexer/admin-cli-api-key-management",
            },
            {
              text: "Muted Accounts",
              link: "/indexer/admin-cli-muted-accounts",
            },
            {
              text: "Comments Premoderation",
              link: "/indexer/admin-cli-comments-premoderation",
            },
          ],
        },
        {
          text: "Index Supply",
          link: "/index-supply",
        },
      ],
    },
    {
      text: "Demos & Examples",
      items: [
        {
          text: "React Custom Integration",
          link: "/demos/custom-integration",
          collapsed: true,
          items: [
            {
              text: "Demo",
              link: "https://demo.ethcomments.xyz/",
            },
            {
              text: "Source Code",
              link: "https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo",
            },
          ],
        },
        {
          text: "React Native Integration",
          link: "/demos/react-native-integration",
          collapsed: true,
          items: [
            {
              text: "Source Code",
              link: "https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo-rn-expo",
            },
          ],
        },
        {
          text: "Blog with <CommentsEmbed />",
          link: "/demos/blog",
          collapsed: true,
          items: [
            {
              text: "Demo",
              link: "https://demo-blog.ethcomments.xyz/blog/spaces-vs-tabs",
            },
            {
              text: "Source Code",
              link: "https://github.com/ecp-eth/comments-monorepo/tree/main/apps/embed-demo-blog",
            },
          ],
        },
      ],
    },
    {
      text: "Resources",
      items: [
        {
          text: "Logo Assets",
          link: "/logo-assets",
        },
        {
          text: "Contract",
          link: "/contract",
        },
        {
          text: "Gas Costs",
          link: "/gas-costs",
        },
      ],
    },
    {
      text: "Reference",
      items: [
        {
          text: "SDK Reference",
          link: "/sdk-reference",
          collapsed: true,
          items: [
            {
              text: "Default Exports",
              link: "/sdk-reference/defaultExports/",
            },
            {
              text: "Types Module",
              link: "/sdk-reference/types/",
            },
            {
              text: "React Module",
              link: "/sdk-reference/react/",
            },
            {
              text: "Zod Schemas",
              link: "/sdk-reference/schemas/",
            },
          ],
        },
        {
          text: "Indexer Reference",
          link: "/indexer-reference/",
          collapsed: true,
          items: [
            {
              text: "RESTful API",
              link: "/indexer-reference/restful",
            },
            {
              text: "GraphQL API",
              link: "https://api.ethcomments.xyz/graphql",
            },
          ],
        },
        {
          text: "Protocol Reference",
          link: "/protocol-reference/CommentsV1",
        },
      ],
    },
  ],
  topNav: [
    { text: "Github", link: "https://github.com/ecp-eth/comments-monorepo" },
    {
      text: "Support",
      link: "https://t.me/+LkTGo4MdO_1lZDlk",
    },
    {
      text: "Contact",
      link: "https://t.me/davidfurlong",
    },
  ],
  markdown: {
    remarkPlugins: [
      remarkMermaid,
      [
        remarkFindAndReplace,
        {
          replacements: {
            COMMENTS_V1_ADDRESS: COMMENTS_V1_ADDRESS,
          },
        },
      ],
    ],
  },
  vite: {
    envPrefix: "VITE_",
    define: {
      "import.meta.env.COMMENTS_V1_ADDRESS":
        JSON.stringify(COMMENTS_V1_ADDRESS),
    },
  },
});
