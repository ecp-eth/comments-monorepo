export function MainWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-0 text-foreground font-default px-root-padding-horizontal py-root-padding-vertical">
      {children}
    </main>
  );
}
