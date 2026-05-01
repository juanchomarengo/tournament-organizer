"use client";

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className = "", variant = "primary", ...rest }, ref) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles: Record<Variant, string> = {
    primary: "bg-cyan-bright text-navy-950 hover:scale-[1.03] hover:glow-cyan",
    ghost: "hairline text-foreground hover:bg-white/5",
    danger: "border border-rose-400/40 text-rose-200 hover:bg-rose-400/10",
  };
  return <button ref={ref} className={`${base} ${styles[variant]} ${className}`} {...rest} />;
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-subtle outline-none transition focus:border-cyan-bright/60 focus:bg-white/10 ${className}`}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={`rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground outline-none transition focus:border-cyan-bright/60 focus:bg-white/10 ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl glass p-5 ${className}`}>{children}</div>
  );
}

export function Badge({ children, color = "cyan" }: { children: ReactNode; color?: "cyan" | "violet" | "pink" | "muted" }) {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-bright/15 text-cyan-bright border-cyan-bright/30",
    violet: "bg-sirius-violet/15 text-sirius-violet border-sirius-violet/30",
    pink: "bg-sirius-pink/15 text-sirius-pink border-sirius-pink/30",
    muted: "bg-white/5 text-muted border-white/10",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}
