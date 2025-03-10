import React from "react";
import { defineConfig } from "vocs";
import { remarkMermaid } from "@theguild/remark-mermaid";
import remarkCodesandbox from "remark-codesandbox";

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
          items: [
            {
              text: "React Component Library",
              link: "/integration-options/react-component-library",
            },
            {
              text: "Index API",
              link: "/integration-options/indexer-api",
            },
            {
              text: "Contract Interaction",
              items: [
                {
                  text: "Post comment as author",
                  link: "/integration-options/contract-interactions/post-as-author",
                },
              ],
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
        },
        {
          text: "Alt Indexers: Index Supply",
          link: "/index-supply",
        },
      ],
    },
    {
      text: "Advanced",
      items: [
        {
          text: "Test with Anvil",
          link: "/test-with-anvil",
        },
      ],
    },
    {
      text: "Indexer",
      items: [
        {
          text: "Admin CLI",
          link: "/indexer/admin-cli",
          items: [
            {
              text: "API Key Management",
              link: "/indexer/admin-cli-api-key-management",
            },
            {
              text: "Spammers",
              link: "/indexer/admin-cli-spammers",
            },
          ],
        },
        {
          text: "Spam Prevention",
          link: "/indexer/spam-prevention",
        },
      ],
    },
    {
      text: "Reference",
      items: [
        {
          text: "SDK Reference",
          link: "/sdk-reference",
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
          ],
        },
        {
          text: "Indexer Reference",
          link: "/indexer-reference/",
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
    {
      text: "Demos & Examples",
      items: [
        {
          text: "Custom Integration",
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
          text: "Blog with <CommentsEmbed />",
          link: "/demos/blog",
          collapsed: true,
          items: [
            {
              text: "Demo",
              link: "https://demo-blog.ethcomments.xyz/",
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
          text: "FAQ",
          items: [
            {
              text: "Gas Costs",
              link: "/gas-costs",
            },
          ],
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
    remarkPlugins: [
      remarkMermaid,
      [
        remarkCodesandbox,
        {
          mode: "button",
          customTemplates: {
            "ecp-eth-codesandbox-ts": {
              extends: "file:templates/codesandbox-ts",
              entry: "src/run.ts",
            },
          },
        },
      ],
    ],
  },
  vite: {
    envPrefix: "VITE_",
  },
});
