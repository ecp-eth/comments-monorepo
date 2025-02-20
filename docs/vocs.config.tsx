import React from 'react';
import { defineConfig } from 'vocs';
import { remarkMermaid } from '@theguild/remark-mermaid';
import remarkCodesandbox from 'remark-codesandbox';

export default defineConfig({
  title: 'Ethereum Comments Protocol',
  description: 'A decentralized protocol for adding comments to any Ethereum address or transaction',
  logoUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  iconUrl: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  rootDir: ".",
  head: () => {
    return (
      <>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
      </>
    )
  },
  editLink: { 
    pattern: 'https://github.com/ecp-eth/comments-monorepo/edit/main/docs/pages/:path', 
    text: 'Edit on GitHub'
  },
  sidebar: [
    {
      text: 'Introduction',
      link: '/'
    },
    {
      text: 'Getting Started',
      items: [
        {
          text: 'Quick Start',
          link: '/quick-start'
        },
        {
          text: 'Integration Options',
          link: '/integration-options',
          items: [
            {
              text: 'React Component Library',
              link: '/integration-options#1-react-component-library'
            },
            {
              text: 'Index API',
              link: '/integration-options#2-indexer-api',
            },
            {
              text: 'Contract Interaction',
              link: '/integration-options#4-contract-interaction'
            }
          ]
        }
      ]
    },
    {
      text: 'How it works',
      items: [
        {
          text: 'Architecture Overview',
          link: '/architecture-overview'
        },
        {
          text: 'Dual-signature System',
          link: '/dual-signature-system'
        },
        {
          text: 'Post comment flow',
          link: '/post-comment-flow'
        }
      ]
    },
    {
      text: 'Resources',
      items: [
        {
          text: 'SDK Reference',
          link: '/sdk-reference',
          items: [
            {
              text: 'Default Exports',
              link: '/sdk-reference/defaultExports/'
            },
            {
              text: 'Types Module',
              link: '/sdk-reference/types/'
            },
            {
              text: 'React Module',
              link: '/sdk-reference/react/'
            }
          ]
        },
        {
          text: 'Protocol Reference',
          link: '/protocol-reference/CommentsV1',
        },
        {
          text: 'Demo Repo Links',
          items: [
            {
              text: 'Custom Integration',
              link: 'https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo'
            },
            {
              text: 'Using <CommentsEmbed />',
              link: 'https://github.com/ecp-eth/comments-monorepo/tree/main/apps/embed'
            }
          ]
        }
      ]
    }
  ],
  topNav: [
    { text: "Github", link: "https://github.com/ecp-eth/comments-monorepo" }
  ],
  markdown: {
    remarkPlugins: [remarkMermaid, [remarkCodesandbox, { 
      mode: 'button',
      customTemplates: {
        'ecp-eth-codesandbox-ts': {
          extends: 'file:templates/codesandbox-ts',
          entry: 'src/run.ts',
        },
      },
    }]]
  }
}) 
