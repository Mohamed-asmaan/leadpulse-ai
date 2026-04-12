"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { API_BASE } from "@/lib/config";
import { saveSession } from "@/lib/auth";
import { parseApiErrorResponse } from "@/lib/parseApiError";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        throw new Error(await parseApiErrorResponse(res));
      }
      const data = (await res.json()) as { access_token: string; role: string; full_name: string };
      saveSession(data.access_token, data.role, data.full_name);
      router.replace("/overview");
    } catch (err) {
      if (err instanceof TypeError && String(err.message).toLowerCase().includes("fetch")) {
        setError(
          `Cannot reach the API (${API_BASE}). Start the backend (e.g. uvicorn on port 8000), ` +
            `or set NEXT_PUBLIC_API_URL in frontend/.env.local. If the API uses another port, set ` +
            `LEADPULSE_API_PROXY_TARGET in .env.local and restart next dev.`,
        );
        return;
      }
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">LeadPulse AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to the operations dashboard.</p>
        </div>
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <div className="text-muted-foreground mb-1">Email</div>
            <input
              className="w-full rounded-md bg-background border border-border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <div className="text-muted-foreground mb-1">Password</div>
            <input
              className="w-full rounded-md bg-background border border-border px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90 py-2 text-sm font-semibold shadow-sm"
          >
            Continue
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          Demo users: <span className="text-muted-foreground">admin@example.com</span> / <span className="text-muted-foreground">Admin123!</span> and{" "}
          <span className="text-muted-foreground">sales@example.com</span> / <span className="text-muted-foreground">Sales123!</span>
        </p>
      </div>
    </div>
  );
}
