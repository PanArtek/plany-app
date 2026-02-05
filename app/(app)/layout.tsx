export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar placeholder - will be replaced in UI-006 */}
      <aside className="fixed w-[240px] h-screen bg-card border-r border-border">
        <div className="p-4 text-muted-foreground">Sidebar placeholder</div>
      </aside>
      <main className="flex-1 ml-[240px] p-6">
        {children}
      </main>
    </div>
  );
}
