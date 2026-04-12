"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";

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

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-sm text-slate-500">
        Authenticating…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed z-50 inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transform transition-transform md:translate-x-0 md:static md:z-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-800 shrink-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-900/40" />
          <div>
            <div className="text-sm font-semibold tracking-tight">LeadPulse AI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Operations</div>
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
                  active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 text-xs text-slate-500 shrink-0">
          Role-based views enabled ({role}).
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 rounded-md border border-slate-800 text-slate-300"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="text-sm text-slate-400 hidden sm:block">
              In-app capture · Webhooks · Enrichment + scored tiers (Hot/Warm/Cold)
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400 hidden sm:inline">
              {name}
              <span className="text-slate-600"> · </span>
              <span className="capitalize text-sky-300/90">{role}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.replace("/login");
              }}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
