"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import {
  ADMIN_NAV_ITEMS,
  getNavItemByHref,
  getNavItemsForRole,
} from "@/lib/auth/permissions";

type AdminShellProps = {
  user: {
    name?: string | null;
    email: string;
    role: Role;
  };
  children: React.ReactNode;
};

function resolvePageTitle(pathname: string) {
  const exact = getNavItemByHref(pathname);
  if (exact) {
    return exact.title;
  }

  const nested = ADMIN_NAV_ITEMS.filter(
    (item) =>
      item.href !== "/admin" &&
      (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  return nested?.title ?? "Admin";
}

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = useMemo(() => getNavItemsForRole(user.role), [user.role]);
  const title = resolvePageTitle(pathname);

  function toggleCollapsed() {
    setCollapsed((current) => !current);
  }

  return (
    <div className="flex min-h-svh bg-muted/30 text-foreground">
      <AdminSidebar
        items={navItems}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          title={title}
          navItems={navItems}
          user={{
            name: user.name?.trim() || user.email,
            email: user.email,
            role: user.role,
          }}
        />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
