"use client";
import { useAccount } from "wagmi";
import { redirect } from "next/navigation";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const account = useAccount();

  if (account.isReconnecting || account.isConnecting) {
    // @todo render nice loading state
    return <div>Reconnecting...</div>;
  }

  if (account.isDisconnected) {
    return redirect("/sign-in");
  }

  return <>{children}</>;
}
