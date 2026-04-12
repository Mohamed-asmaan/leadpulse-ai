import { BarChart3, LayoutGrid, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Role = "admin" | "sales";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
};

export const mainNav: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutGrid, roles: ["admin", "sales"] },
  { href: "/leads", label: "Lead Management", icon: Users, roles: ["admin", "sales"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "sales"] },
];
