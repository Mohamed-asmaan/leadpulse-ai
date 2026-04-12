"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type FlashType = "success" | "error";

type FlashItem = { id: number; message: string; type: FlashType };

const FlashCtx = createContext<{ flash: (message: string, type?: FlashType) => void } | null>(null);

export function useFlash() {
  const v = useContext(FlashCtx);
  if (!v) throw new Error("useFlash must be used under FlashProvider");
  return v;
}

export function FlashProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlashItem[]>([]);
  const seq = useRef(0);

  const flash = useCallback((message: string, type: FlashType = "success") => {
    const id = ++seq.current;
    setItems((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ flash }), [flash]);

  return (
    <FlashCtx.Provider value={value}>
      {children}
      <div className="fixed top-14 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {items.map((f) => (
          <div
            key={f.id}
            className={
              "pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg flex items-start gap-2 " +
              (f.type === "error"
                ? "border-destructive/50 bg-destructive/10 text-destructive-foreground"
                : "border-emerald-800/50 bg-emerald-950/90 text-emerald-100")
            }
          >
            <span className="flex-1">{f.message}</span>
            <button
              type="button"
              className="p-0.5 rounded hover:bg-white/10"
              aria-label="Dismiss"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== f.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </FlashCtx.Provider>
  );
}
