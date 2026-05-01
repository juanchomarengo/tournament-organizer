"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface MenuLink {
  href: string;
  label: string;
}

export function MobileMenu({ links, active }: { links: MenuLink[]; active?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full hairline text-foreground hover:bg-white/5 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>

      {open && mounted &&
        createPortal(
          <div
            className="fixed left-0 right-0 bottom-0 top-[64px] z-40 flex flex-col md:hidden"
            style={{
              background:
                "linear-gradient(180deg, var(--color-navy-900) 0%, var(--color-navy-800) 100%)",
            }}
            onClick={() => setOpen(false)}
          >
            <nav className="flex flex-col gap-1 px-6 py-6">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-base transition ${
                    active === l.href
                      ? "bg-cyan-bright/15 text-cyan-bright"
                      : "text-foreground hover:bg-white/5"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
