"use client";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return redirect("/");
  }

  return <main>{children}</main>;
}
