"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Inbox, LayoutDashboard, MailCheck, Settings } from "lucide-react";

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

      <div className="mt-3 hidden rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500 lg:block">
        <div className="mb-2 flex items-center gap-2 font-semibold text-zinc-700">
          <FileText size={14} aria-hidden="true" />
          MVP scope
        </div>
        Gmail inbox connection is not enabled yet.
      </div>
    </aside>
  );
}
