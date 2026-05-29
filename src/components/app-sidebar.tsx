"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, FileText, Inbox, LayoutDashboard, MailCheck, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Emails", href: "/emails", icon: Inbox },
  { label: "Drafts", href: "/drafts", icon: MailCheck },
  { label: "Settings", href: "/settings", icon: Settings },
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
    <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium transition lg:w-full ${
                isActive ? "bg-teal-50 text-teal-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <item.icon size={17} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 hidden rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 lg:block">
        <div className="mb-2 flex items-center gap-2 font-semibold text-zinc-700">
          <FileText size={14} aria-hidden="true" />
          MVP scope
        </div>
        {[
          ["Gmail connected", gmailConnected === null ? "Checking" : gmailConnected ? "Yes" : "No"],
          ["AI enabled", aiEnabled === null ? "Checking" : aiEnabled ? "Yes" : "No"],
          ["Draft approval", "Enabled"],
        ].map(([label, value]) => (
          <div key={label} className="mt-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} aria-hidden="true" />
              {label}
            </span>
            <span className="font-semibold text-zinc-800">{value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
