import Link from "next/link";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div>
        <Link href="/">Discover</Link>
        <Link href="/my-channels">My Channels</Link>
      </div>
    </div>
  );
}
