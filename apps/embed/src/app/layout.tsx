import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { WatchDocumentResize } from "@/components/WatchDocumentResize";
import { ApplyCSSSelectorTags } from "@/components/ApplyCSSSelectorTags";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- need to be like this to preload the font
const geistSans = Geist({
  subsets: ["latin-ext"],
});

export const metadata: Metadata = {
  title: "Ethereum Comments Protocol Embed",
  description: "Embedded comments section",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="has-parent-window has-not-parent-window">
      <head>
        <meta name="color-scheme" content="dark light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased bg-background">
        {children}
        <WatchDocumentResize />
        <ApplyCSSSelectorTags />
      </body>
    </html>
  );
}
