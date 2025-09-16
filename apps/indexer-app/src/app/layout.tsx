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
  title: "ECP Indexer App",
  description:
    "ECP Indexer App to manage your applications and webhooks for Ethereum Comments Protocol",
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
        <AuthProvider
          accessToken={requestCookies.get("accessToken")?.value ?? null}
          hasRefreshToken={requestCookies.get("refreshToken") !== undefined}
        >
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
