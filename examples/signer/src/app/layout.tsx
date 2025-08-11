import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECP Comments Signer",
  description: "API service for signing ECP comments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">{children}</div>
      </body>
    </html>
  );
}
