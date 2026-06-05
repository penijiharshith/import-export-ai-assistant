import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-0 lg:h-screen">
        <AppSidebar />
      </div>
      <section className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 xl:px-8">{children}</section>
    </main>
  );
}
