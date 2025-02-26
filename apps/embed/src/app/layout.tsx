import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { WatchDocumentResize } from "@/components/WatchDocumentResize";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        {children}
        <WatchDocumentResize />
      </body>
    </html>
  );
}
