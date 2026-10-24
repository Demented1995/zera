"use client";

import { Menu } from "lucide-react";

import { UserMenu } from "@/components/admin/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminNav } from "@/components/admin/admin-nav";
import type { AdminNavItem } from "@/lib/auth/permissions";
import { useState } from "react";
import Link from "next/link";

type AdminHeaderProps = {
  title: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  navItems: AdminNavItem[];
};

export function AdminHeader({ title, user, navItems }: AdminHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Deschide meniul"
          >
            <Menu className="size-4" />
          </Button>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle>
                <Link
                  href="/admin"
                  className="text-lg font-semibold tracking-[0.18em]"
                  onClick={() => setMobileOpen(false)}
                >
                  ZERA
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="py-3">
              <AdminNav
                items={navItems}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground md:text-base">
            {title}
          </p>
        </div>
      </div>

      <UserMenu name={user.name} email={user.email} role={user.role} />
    </header>
  );
}
