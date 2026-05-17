"use client";

import { useState, useEffect } from "react";
import { SearchModal } from "./SearchModal";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-3 px-4 py-2 rounded transition-all duration-200"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <span className="text-sm">Rechercher…</span>
        <span
          className="font-mono text-[11px] px-1.5 py-0.5 rounded"
          style={{
            background: "var(--surface-strong)",
            border: "0.5px solid var(--border)",
          }}
        >
          ⌘ K
        </span>
      </button>
      {open && <SearchModal onClose={() => setOpen(false)} />}
    </>
  );
}
