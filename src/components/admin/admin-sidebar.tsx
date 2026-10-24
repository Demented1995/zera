"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AdminNavItem } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type AdminSidebarProps = {
  items: AdminNavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AdminSidebar({
  items,
  collapsed,
  onToggleCollapsed,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden h-svh shrink-0 flex-col border-r border-border bg-card md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center gap-2 px-3",
          collapsed ? "justify-center" : "justify-between px-4",
        )}
      >
        {!collapsed ? (
          <Link
            href="/admin"
            className="text-lg font-semibold tracking-[0.18em] text-foreground"
          >
            ZERA
          </Link>
        ) : (
          <Link
            href="/admin"
            className="text-sm font-semibold tracking-[0.12em] text-foreground"
            title="ZERA"
          >
            Z
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Extinde meniul" : "Restrânge meniul"}
          className={cn(collapsed && "hidden")}
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>

      {collapsed ? (
        <div className="flex justify-center pb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapsed}
            aria-label="Extinde meniul"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      ) : null}

      <Separator />

      <div className="flex-1 overflow-y-auto py-3">
        <AdminNav items={items} collapsed={collapsed} />
      </div>
    </aside>
  );
}
