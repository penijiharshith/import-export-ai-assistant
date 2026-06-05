import { AppShell } from "@/components/app-shell";

export default function DashboardLoading() {
  return (
    <AppShell>
      <div className="mb-6 h-20 animate-pulse rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl border border-slate-100 bg-white shadow-sm" />
        ))}
      </div>
      <div className="mt-6 h-80 animate-pulse rounded-xl border border-slate-100 bg-white shadow-sm" />
    </AppShell>
  );
}
