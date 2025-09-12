import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";

import { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Broadcast Channels Mini App",
  description:
    "Broadcast Channels Mini App powered by Ethereum Comments Protocol",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestCookies = await cookies();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider accessToken={requestCookies.get("accessToken")?.value}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
