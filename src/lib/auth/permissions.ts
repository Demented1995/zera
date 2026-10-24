import type { Role } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Package,
  Ruler,
  Settings,
  ShoppingBag,
  Image as ImageIcon,
  Users,
  Wrench,
} from "lucide-react";

export type AdminAccess = "staff" | "admin";

export type AdminNavItem = {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  access: AdminAccess;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    title: "Dashboard",
    description: "Prezentare generală",
    icon: LayoutDashboard,
    access: "staff",
  },
  {
    href: "/admin/configurator",
    title: "Configurator profesional",
    description: "Configurare oglinzi",
    icon: Wrench,
    access: "staff",
  },
  {
    href: "/admin/configuratii",
    title: "Configurații salvate",
    description: "Configurații oglinzi",
    icon: ClipboardList,
    access: "staff",
  },
  {
    href: "/admin/oferte",
    title: "Oferte",
    description: "Oferte clienți",
    icon: ShoppingBag,
    access: "staff",
  },
  {
    href: "/admin/modele",
    title: "Modele de oglinzi",
    description: "Catalog comercial",
    icon: Package,
    access: "staff",
  },
  {
    href: "/admin/categorii",
    title: "Categorii comerciale",
    description: "Categorii modele",
    icon: FolderTree,
    access: "staff",
  },
  {
    href: "/admin/materiale",
    title: "Materiale și componente",
    description: "Stoc și componente",
    icon: Boxes,
    access: "staff",
  },
  {
    href: "/admin/preturi",
    title: "Prețuri și formule",
    description: "Reguli de preț",
    icon: Ruler,
    access: "staff",
  },
  {
    href: "/admin/comenzi",
    title: "Comenzi",
    description: "Gestionare comenzi",
    icon: ShoppingBag,
    access: "staff",
  },
  {
    href: "/admin/clienti",
    title: "Clienți",
    description: "Bază de clienți",
    icon: ClipboardList,
    access: "staff",
  },
  {
    href: "/admin/media",
    title: "Media",
    description: "Fișiere și imagini",
    icon: ImageIcon,
    access: "staff",
  },
  {
    href: "/admin/utilizatori",
    title: "Utilizatori",
    description: "Conturi și roluri",
    icon: Users,
    access: "admin",
  },
  {
    href: "/admin/setari",
    title: "Setări",
    description: "Setări aplicație",
    icon: Settings,
    access: "admin",
  },
];

/** Sensitive settings subsection keys reserved for ADMIN. */
export const ADMIN_ONLY_SETTING_KEYS = [
  "security",
  "integrations",
  "billing",
] as const;

export function canAccess(role: Role, access: AdminAccess): boolean {
  if (access === "admin") {
    return role === "ADMIN";
  }
  return role === "ADMIN" || role === "MANAGER";
}

export function getNavItemsForRole(role: Role): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => canAccess(role, item.access));
}

export function getNavItemByHref(href: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.href === href);
}

export function isAdminRole(role: Role): boolean {
  return role === "ADMIN";
}
