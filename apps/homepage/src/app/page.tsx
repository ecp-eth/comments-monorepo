import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GithubIcon,
  Layers,
  Zap,
  Globe,
  Users,
  Send,
  Component,
  Palette,
  Parentheses,
  BadgeCheck,
  Waypoints,
  Expand,
  TicketCheck,
  Code,
  Search,
  ArrowLeftRight,
  MessageSquare,
  Coins,
} from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";

function GraphPaper({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px),
            linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "10px 10px, 10px 10px, 50px 50px, 50px 50px",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "10px 10px, 10px 10px, 50px 50px, 50px 50px",
        }}
      />
      {/* Gradient mask */}
      <div
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none hidden dark:block"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%)",
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export const metadata: Metadata = {
  title: "ECP",
  description:
    "A modular protocol for onchain comments that enables apps to add social features without buying into a full-stack social network. Built on Ethereum standards, chain-agnostic, and free to use.",
  openGraph: {
    title: "ECP",
    description:
      "A modular protocol for onchain comments that enables apps to add social features without buying into a full-stack social network. Built on Ethereum standards, chain-agnostic, and free to use.",
    url: "https://ethcomments.xyz",
    siteName: "ECP",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ethereum Comments Protocol",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ethereum Comments Protocol",
    description:
      "An open protocol and toolkit for onchain comments. Add commenting to your app in 5 minutes, via ECP - stable, secure and neutral infrastructure for driving onchain engagement.",
    images: ["/og-image.png"],
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      {/* Header */}
      <GraphPaper>
        <header className="">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src="/logo-light.svg"
                alt="ECP Logo"
                className="w-8 h-8 dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt="ECP Logo"
                className="w-8 h-8 hidden dark:block"
              />
              <span className="font-semibold text-lg text-gray-900 dark:text-white">
                Ethereum Comments Protocol
              </span>
            </div>

            <nav className="flex items-center space-x-6">
              <Link
                href="https://docs.ethcomments.xyz/"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors hidden md:block"
              >
                Docs
              </Link>
              <Link
                href="https://demo.ethcomments.xyz"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors hidden md:block"
              >
                Demo
              </Link>
              <Link
                href="https://t.me/+LkTGo4MdO_1lZDlk"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors hidden md:block"
              >
                Community
              </Link>

              <Button
                variant="default"
                size="lg"
                className="px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-500 hidden md:flex"
                asChild
              >
                <Link href="https://docs.ethcomments.xyz/">
                  <Zap className="w-5 h-5 mr-1" />
                  Quickstart
                </Link>
              </Button>
            </nav>
          </div>
        </header>
        {/* Hero Section */}
        <section className="py-10 md:py-12 px-4">
          <div className="container mx-auto text-center max-w-6xl">
            <h1 className="text-4xl max-w-3xl mx-auto md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              A new, programmable social content primitive on Ethereum.
            </h1>
            <h2 className="text-xl max-w-3xl mx-auto md:text-xl text-gray-900 dark:text-white mb-6 leading-tight bg-clip-text bg-gradient-to-b from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              Add ECP to your Ethereum app in 5 minutes
            </h2>

            {/* <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            main benefits
          </p>
          FIXME: Add swap with comment & swap w comment feed. Live? */}
            <div className="flex flex-row gap-4 justify-center items-center py-8">
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="px-8 py-3 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <Link href="https://github.com/ecp-eth/comments-monorepo">
                  <GithubIcon className="w-5 h-5 mr-2" />
                  Github
                </Link>
              </Button>

              <Button
                variant="default"
                size="lg"
                className="px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-500"
                asChild
              >
                <Link href="https://docs.ethcomments.xyz/">
                  <Zap className="w-5 h-5 mr-2" />
                  Quickstart
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-6 max-w-7xl mx-auto py-4">
            <Card className="p-2 px-2 border-none shadow-none hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-black group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-black rounded-lg flex items-center justify-center">
                  <ArrowLeftRight className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">
                  Swap with Comment
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Add social context to DEX swaps. Let users share insights and
                  build community around trading.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="p-2 px-2 border-none shadow-none hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-black group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-black rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">
                  Onchain Disqus
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Replace traditional comments with decentralized alternatives
                  without sacrificing UX
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="p-2 px-2 border-none shadow-none hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-black group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-black rounded-lg flex items-center justify-center">
                  <Coins className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">
                  Programmable Content
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Use ECP hooks to create tokenized content. Reward creators
                  with custom token economies.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="p-2 border-none shadow-none hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-black group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-black rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">
                  Build Social Apps
                </CardTitle>
              </CardHeader>
              <CardContent className="">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Create decentralized social apps using ECP for posts, use{" "}
                  <Link
                    href="https://ens.domains"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    ENS
                  </Link>{" "}
                  or your own profiles, use{" "}
                  <Link
                    href="https://efp.app"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    EFP
                  </Link>{" "}
                  for follows.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </GraphPaper>

      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Integration Options
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-4xl mx-auto">
              We made it simple to put comments on Ethereum without having to
              get your users to sign up to yet another profile.
            </p>
          </div>

          <div className="grid md:grid-cols-2 2xl:grid-cols-4 gap-8 2xl:max-w-8xl mx-auto">
            <Card className="border-2 hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700 justify-start">
              <CardHeader className="flex-1">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>

                <CardTitle className="text-gray-900 dark:text-white">
                  No Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Single-line, copy and paste implementation for static sites,
                  blogs, and basic integrations.
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`<iframe
  src="https://embed.ethcomments.xyz
?uri=https://example.com
&config=..."
  style="width: 100%;height: 600px;"
  title="Comments"
>
</iframe>`}
                  </code>
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full dark:text-white hover:dark:text-white dark:border-gray-400"
                  asChild
                >
                  <Link href="https://docs.ethcomments.xyz/integration-options/embed-comments">
                    Get Started
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex-1">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Component className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>

                <CardTitle className="text-gray-900 dark:text-white">
                  React Components
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Customize your own commenting UI, using an open source Ponder
                  indexer and example code for React and React Native.
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`npm install @ecp.eth/sdk`}
                  </code>
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`import { CommentsEmbed }
  from "@ecp.eth/sdk/embed"

<CommentsEmbed
  uri={...}
  theme={{...}}
  // ...
/>`}
                  </code>
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full dark:text-white hover:dark:text-white dark:border-gray-400"
                  asChild
                >
                  <Link href="https://docs.ethcomments.xyz/integration-options/contract-interactions">
                    Get Started
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex-1">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>

                <CardTitle className="text-gray-900 dark:text-white">
                  TypeScript SDK
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Customize your own commenting UI, using an open source Ponder
                  indexer and example code for React and React Native.
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`npm install @ecp.eth/sdk`}
                  </code>
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`import { fetchComments }
  from "@ecp.eth/sdk/indexer"

await fetchComments({
  apiUrl:
    "https://api.ethcomments.xyz",
  targetUri:
    "https://demo.ethcomments.xyz",
});`}
                  </code>
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full dark:text-white hover:dark:text-white dark:border-gray-400"
                  asChild
                >
                  <Link href="https://docs.ethcomments.xyz/integration-options/contract-interactions">
                    Get Started
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors h-full flex flex-col bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700">
              <CardHeader className="flex-1">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <Parentheses className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <CardTitle className="text-gray-900 dark:text-white">
                  Smart Contracts
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Direct contract integration for custom implementations and
                  advanced use cases.
                  <code className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 block mt-4 whitespace-pre text-gray-700 dark:text-gray-300">
                    {`CommentManager.postComment(
  CommentData({
    content: "Hello World!",
    author: msg.sender,
    // ...
  }),
  appSignature
);`}
                  </code>
                </CardDescription>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full dark:text-white hover:dark:text-white dark:border-gray-400"
                  asChild
                >
                  <Link href="https://docs.ethcomments.xyz/integration-options/contract-interactions">
                    Get Started
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Technical Overview */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              The Benefits of putting comments onchain with ECP
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Permissionless & Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comments become part of the permanent, open record of Ethereum,
                allowing any application to access and display them without
                permission.
              </p>
            </div>

            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Waypoints className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Composable & Programmable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comments can be programmatically referenced by other smart
                contracts and applications, enabling new use cases.
              </p>
            </div>

            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <BadgeCheck className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Verifiable
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Onchain comments are cryptographically signed, providing proof
                of who wrote what and when.
              </p>
            </div>

            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Expand className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Censorship Resistant
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                While apps can moderate their own interfaces, the underlying
                comment data remains accessible on chain.
              </p>
            </div>

            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Cheap & Fast
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Gas Optimized for L2s: ~$0.001 per comment on Base. Optional
                delegated signing and calldata suffix for UX.
              </p>
            </div>

            <div className="text-center group p-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <TicketCheck className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Attributable to your App
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Comments are attributed to the author and the app, enabling
                composable rewards and growing the daily transacting users in
                your app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Build the future of decentralized social with us
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Connect with other developers building on ECP. Share ideas, get
            support, and help shape the future of onchain social infrastructure.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700">
              <CardContent className="pt-4 text-center">
                <Send className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Telegram
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Ask questions, get support, and get community updates
                </p>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="https://t.me/+LkTGo4MdO_1lZDlk">
                    Join Telegram
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-800 group border-gray-200 dark:border-gray-700">
              <CardContent className="pt-4 text-center">
                <GithubIcon className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mx-auto mb-3" />
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  GitHub
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Contribute to the protocol, report issues, and collaborate
                </p>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="https://github.com/ecp-eth/comments-monorepo">
                    View on GitHub
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            Building something cool with ECP? We&apos;d love to hear about it
            and feature your project!
          </p>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Simple by default, powerful with hooks
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Add custom functionality to your comments through smart contract
              hooks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Token-Gating
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Restrict commenting to token holders or implement custom access
                control logic.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Onchain Bots
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create automated bots that can post comments and interact with
                your community programmatically.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">
                Collectible Content
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Turn comments into collectible NFTs and create unique onchain
                experiences for your community.
              </p>
            </div>
          </div>

          <div className="text-center mt-8 flex justify-center gap-6">
            <Button
              variant="ghost"
              asChild
              className="hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <Link href="https://docs.ethcomments.xyz/hooks">
                <Code className="w-5 h-5 mr-2" />
                Create a hook
              </Link>
            </Button>
            <Button
              variant="default"
              asChild
              className="px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-500"
            >
              <Link href="https://github.com/ecp-eth/awesome-ecp-hooks">
                <Search className="w-5 h-5 mr-2" />
                Discover hooks
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-2xl bg-white dark:bg-black rounded-lg p-8">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-lg text-gray-400 dark:text-gray-400 mb-8">
            Get the latest updates on protocol development, new features, and
            integration guides.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <iframe
              src="https://paragraph.com/@df/embed?minimal=true&vertical=true"
              className="w-full max-w-full"
              width="480"
              height="90"
              frameBorder="0"
              scrolling="no"
            ></iframe>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            No spam, unsubscribe at any time. We respect your privacy.
          </p>
        </div>
      </section>

      {/* Built on ECP Section */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Built on ECP
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Discover applications and projects built on the Ethereum Comments
            Protocol
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-700 group border-gray-200 dark:border-gray-600">
              <CardContent className="pt-6 flex-grow text-center">
                <div className="flex justify-center mb-4">
                  <img
                    src="/interface-logo.png"
                    alt="Interface.social"
                    className="h-16 w-auto object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Interface.social
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Mobile companion for your Ethereum journey
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href="https://interface.social"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Post your take on Interface
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-700 group border-gray-200 dark:border-gray-600">
              <CardContent className="pt-6 flex-grow text-center">
                <div className="flex justify-center mb-4">
                  <img
                    src="/town.png"
                    alt="Town"
                    className="h-16 w-auto object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Town
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Join the ECP community on Telegram
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href="https://t.me/+vxh3qr_ivnczMTBk"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Town
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-700 group border-gray-200 dark:border-gray-600">
              <CardContent className="pt-6 flex-grow text-center">
                <div className="flex justify-center mb-4">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 493 487"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="45"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                  >
                    <path d="M350.5 426.182C299 459.5 215 476 128.486 426.182C97.8615 470.932 28 464.172 28 434.339C28 404.506 44.5 269 68 170C163.082 -74.5 499 24.9999 462 269C443.627 390.161 319.238 339.11 336.373 269M336.373 269C374.653 112.375 191.131 100.278 163.082 236.905C132.458 386.071 307.275 388.055 336.373 269Z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Paper
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Discover and share content on Ethereum
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href="https://paper.ink"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit Paper
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-2 hover:border-indigo-400 transition-colors bg-white dark:bg-gray-700 group border-gray-200 dark:border-gray-600">
              <CardContent className="pt-6 flex-grow text-center">
                <div className="flex justify-center mb-4">
                  <GithubIcon className="h-16 w-16 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
                  Awesome ECP
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  A curated list of projects, tools, and resources built on ECP
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href="https://github.com/ecp-eth/awesome-ecp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View More Projects
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 bg-gray-100 dark:bg-gray-900">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Add onchain comments to your application in minutes with our
            easy-to-use SDK and components.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="ghost"
              size="lg"
              className="px-8 py-3 hover:bg-gray-500 dark:hover:bg-gray-800 dark:hover:text-white"
              asChild
            >
              <Link href="https://demo.ethcomments.xyz/">
                <Send className="w-5 h-5 mr-2" />
                View Demo
              </Link>
            </Button>
            <Button
              variant="default"
              size="lg"
              className="px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-500"
              asChild
            >
              <Link href="https://docs.ethcomments.xyz/">
                <Zap className="w-5 h-5 mr-2" />
                Quickstart
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* From the Team Section */}
      <section className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            From the Team That Built
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center p-4">
              <a
                href="https://framesjs.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/framesjs.svg"
                  alt="Frames.js"
                  className="max-h-12 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
            <div className="flex items-center justify-center p-4">
              <a
                href="https://openframes.xyz"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/openframes-dark.png"
                  alt="OpenFrames"
                  className="max-h-12 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
            <div className="flex items-center justify-center p-4">
              <a
                href="https://modprotocol.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/mod-protocol-white.svg"
                  alt="Mod Protocol"
                  className="max-h-12 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
            <div className="flex items-center justify-center p-4">
              <a
                href="https://farcaster.xyz/discove"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/discove-logo-all-w.svg"
                  alt="Discove"
                  className="max-h-12 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img
                src="/logo-light.svg"
                alt="ECP Logo"
                className="w-8 h-8 dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt="ECP Logo"
                className="w-8 h-8 hidden dark:block"
              />
              <span className="font-semibold text-gray-900 dark:text-white">
                Ethereum Comments Protocol
              </span>
            </div>
            <div className="flex flex-col items-center md:items-end space-y-4 md:space-y-0 md:flex-row md:space-x-6">
              <Link
                href="https://demo.ethcomments.xyz"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                Demo
              </Link>
              <Link
                href="https://docs.ethcomments.xyz"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                Quickstart
              </Link>
              <Link
                href="https://t.me/+LkTGo4MdO_1lZDlk"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                Community
              </Link>
              <Link
                href="https://docs.ethcomments.xyz/"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/ecp-eth/comments-monorepo"
                className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
              >
                <GithubIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
