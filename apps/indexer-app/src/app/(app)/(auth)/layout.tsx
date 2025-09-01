"use client";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return redirect("/sign-in");
  }

  return (
    <div>
      <nav>
        <Link href="/">Dashboard</Link>
        <Link href="/apps">Apps</Link>
      </nav>

      {children}
    </div>
  );
}
