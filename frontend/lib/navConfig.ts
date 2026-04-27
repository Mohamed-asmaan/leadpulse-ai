import { ArchiveX, BarChart3, KanbanSquare, LayoutGrid, ListOrdered, Plug2, Settings, Sparkles, UserPlus, Users } from "lucide-react";
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
  { href: "/intelligence", label: "AI Studio", icon: Sparkles, roles: ["admin", "sales"] },
  { href: "/capture", label: "Capture", icon: UserPlus, roles: ["admin", "sales"] },
  { href: "/leads", label: "Lead Management", icon: Users, roles: ["admin", "sales"] },
  { href: "/priority-list", label: "Priority List", icon: ListOrdered, roles: ["admin", "sales"] },
  { href: "/dead-leads", label: "Dead Lead Detector", icon: ArchiveX, roles: ["admin", "sales"] },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare, roles: ["admin", "sales"] },
  { href: "/integrations", label: "Integrations", icon: Plug2, roles: ["admin", "sales"] },
  { href: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "sales"] },
];
