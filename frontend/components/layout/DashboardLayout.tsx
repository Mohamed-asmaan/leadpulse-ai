"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

import { AlertPanel } from "@/components/alerts/AlertPanel";
import { breadcrumbFromPath } from "@/components/layout/breadcrumbLabels";
import { clearSession, getName, getRole, getToken } from "@/lib/auth";
import { mainNav, type Role } from "@/lib/navConfig";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const role = (getRole() as Role | null) || "sales";
  const name = getName() || "User";

  const items = useMemo(() => mainNav.filter((n) => n.roles.includes(role)), [role]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const crumbs = useMemo(() => breadcrumbFromPath(pathname), [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center text-sm">
        Authenticating…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed z-50 inset-y-0 left-0 w-64 border-r border-border bg-card transform transition-transform md:translate-x-0 md:static md:z-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-border shrink-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-indigo-600 shadow-sm ring-1 ring-border" />
          <div>
            <div className="text-sm font-semibold tracking-tight">LeadPulse AI</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Lead response</div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-[10px] text-muted-foreground shrink-0 leading-relaxed">
          UI patterns partially inspired by Open Mercato (MIT). Role: <span className="capitalize text-foreground">{role}</span>.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 md:px-6 py-2 sm:py-0 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 rounded-md border border-border text-muted-foreground shrink-0"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <nav className="text-xs text-muted-foreground hidden sm:flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.href} className="flex items-center gap-1 min-w-0">
                  {i > 0 ? <span className="text-border">/</span> : null}
                  {i < crumbs.length - 1 ? (
                    <Link href={c.href} className="hover:text-primary truncate max-w-[140px]">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium truncate max-w-[200px]">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <span className="text-muted-foreground hidden sm:inline">
              {name}
              <span className="text-border"> · </span>
              <span className="capitalize text-primary">{role}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
            >
              Log out
            </button>
          </div>
        </header>
        <AlertPanel />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
