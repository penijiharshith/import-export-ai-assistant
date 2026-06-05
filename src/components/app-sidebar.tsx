"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Bell, Inbox, LayoutDashboard, MailCheck, PackageCheck, Settings } from "lucide-react";
import { UserProfile } from "@/components/user-profile";

const navGroups = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Emails", href: "/emails", icon: Inbox },
      { label: "Drafts", href: "/drafts", icon: MailCheck },
    ],
  },
  {
    label: "Trade tools",
    items: [
      { label: "Supplier Comparison", href: "/supplier-comparison", icon: BarChart2 },
      { label: "Follow-ups", href: "/follow-ups", icon: Bell },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatuses() {
      try {
        const [gmailResponse, aiResponse] = await Promise.all([
          fetch("/api/auth/debug", { cache: "no-store" }),
          fetch("/api/ai/status", { cache: "no-store" }),
        ]);
        const gmailData = await gmailResponse.json();
        const aiData = await aiResponse.json();

        if (isMounted) {
          setGmailConnected(Boolean(gmailData.providerTokenExists && gmailData.gmailPermissionGranted));
          setAiEnabled(Boolean(aiData.enabled));
        }
      } catch {
        if (isMounted) {
          setGmailConnected(false);
          setAiEnabled(false);
        }
      }
    }

    loadStatuses();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="border-b border-slate-200 bg-white lg:flex lg:h-full lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center border-b border-slate-200 px-4 lg:h-[76px]">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-700 text-white shadow-sm">
            <PackageCheck size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">Import Export</span>
            <span className="block truncate text-xs font-medium text-teal-700">AI Assistant</span>
          </span>
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:gap-5 lg:overflow-visible lg:py-5" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="contents lg:block">
            <p className="hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:block">{group.label}</p>
            <div className="contents lg:mt-2 lg:block lg:space-y-1">
              {group.items.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex h-10 shrink-0 items-center gap-3 rounded-lg border-l-2 px-3 text-sm font-medium transition-all duration-150 lg:w-full ${
                      isActive
                        ? "border-teal-700 bg-teal-50 text-teal-700"
                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-slate-200 p-3 lg:block">
        <div className="mb-3 rounded-lg bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace status</p>
          <div className="mt-2 space-y-1.5 text-xs text-slate-500">
            <StatusRow label="Gmail" value={gmailConnected === null ? "Checking" : gmailConnected ? "Connected" : "Not connected"} active={Boolean(gmailConnected)} />
            <StatusRow label="AI tools" value={aiEnabled === null ? "Checking" : aiEnabled ? "Enabled" : "Unavailable"} active={Boolean(aiEnabled)} />
            <StatusRow label="Approval" value="Enabled" active />
          </div>
        </div>
        <UserProfile compact />
      </div>
    </aside>
  );
}

function StatusRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-1.5 font-medium text-slate-700">
        <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />
        {value}
      </span>
    </div>
  );
}
