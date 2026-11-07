"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AdminNavItem } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type AdminNavProps = {
  items: AdminNavItem[];
  badges?: Record<string, number>;
  collapsed?: boolean;
  onNavigate?: () => void;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items, badges = {}, collapsed = false, onNavigate }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Navigare admin">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        const badge = badges[item.href] ?? 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.title : undefined}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <span className="relative">
              <Icon className="size-4 shrink-0" aria-hidden />
              {collapsed && badge > 0 ? (
                <span className="absolute -top-2 -right-3 rounded-full bg-foreground px-1 text-[10px] leading-4 text-background">
                  +{badge}
                </span>
              ) : null}
            </span>
            {!collapsed ? <span className="truncate">{item.title}</span> : null}
            {!collapsed && badge > 0 ? (
              <span
                className={`ml-auto rounded-full px-1.5 text-xs leading-5 ${active ? "bg-background text-foreground" : "bg-foreground text-background"}`}
              >
                +{badge}
              </span>
            ) : null}
            {collapsed ? <span className="sr-only">{item.title}{badge > 0 ? `, +${badge} nedeschise` : ""}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
