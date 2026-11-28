import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { requireStaffSession } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaffSession();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold tracking-tight">
              ZERA Admin
            </Link>
            <nav className="text-sm text-muted-foreground">
              <span>
                {session.user.email} · {session.user.role}
              </span>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
