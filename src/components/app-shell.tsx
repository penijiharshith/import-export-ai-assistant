import Link from "next/link";
import { Inbox } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { UserProfile } from "@/components/user-profile";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f8faf7]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 text-sm font-semibold text-zinc-950">
            <span className="grid size-9 place-items-center rounded-md bg-teal-700 text-white">
              <Inbox size={18} aria-hidden="true" />
            </span>
            Import Export AI Assistant
          </Link>
          <UserProfile />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[240px_1fr]">
        <AppSidebar />
        <section>{children}</section>
      </div>
    </main>
  );
}
