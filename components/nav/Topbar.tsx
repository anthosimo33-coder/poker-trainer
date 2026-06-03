"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Atelier" },
  { href: "/lesson", label: "Leçon" },
  { href: "/theory", label: "Théorie" },
  { href: "/drill", label: "Drill" },
  { href: "/leaks", label: "Mes leaks" },
  { href: "/stats", label: "Stats" },
] as const;

export function Topbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-8 py-3.5"
      style={{
        backdropFilter: "blur(20px) saturate(180%)",
        background: "rgba(10, 13, 12, 0.7)",
        borderBottom: "0.5px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-medium tracking-tight">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
            style={{
              background: "linear-gradient(135deg, var(--purple-500), var(--purple-700))",
              boxShadow: "0 0 0 0.5px rgba(255,255,255,0.08), 0 4px 12px var(--purple-glow)",
            }}
          >
            ♠
          </span>
          Poker Trainer
        </Link>

        <div
          className="flex gap-0.5 p-0.5 rounded"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
          }}
        >
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                  active
                    ? "text-text"
                    : "text-text-muted hover:text-text hover:bg-surface-hover"
                )}
                style={
                  active
                    ? {
                        background: "var(--surface-strong)",
                        boxShadow: "0 0 0 0.5px var(--border-strong), 0 1px 2px rgba(0,0,0,0.3)",
                      }
                    : undefined
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--purple-400), var(--purple-700))",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1)",
          }}
          aria-label="Profil"
        >
          S
        </div>
      </div>
    </nav>
  );
}
