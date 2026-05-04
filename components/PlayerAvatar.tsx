"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";

const COMBINING_DIACRITICS = /\p{M}/gu;

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SIZE_CLASSES = {
  xs: "size-6 text-[9px]",
  sm: "size-8 text-[10px]",
  md: "size-10 text-xs",
  lg: "size-14 text-sm",
  xl: "size-20 text-base",
};

type Size = keyof typeof SIZE_CLASSES;

interface Props {
  player: Pick<Player, "name"> | undefined;
  size?: Size;
  className?: string;
}

export function PlayerAvatar({ player, size = "md", className = "" }: Props) {
  const [errored, setErrored] = useState(false);
  const sizeCls = SIZE_CLASSES[size];

  if (!player) {
    return (
      <span
        className={`${sizeCls} ${className} inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted`}
      >
        ?
      </span>
    );
  }

  const slug = slugifyName(player.name);
  const url = `/sirius-people/${slug}.jpg`;

  if (errored) {
    return (
      <span
        title={player.name}
        className={`${sizeCls} ${className} inline-flex shrink-0 items-center justify-center rounded-full border border-cyan-bright/30 font-semibold text-cyan-bright`}
        style={{
          background:
            "linear-gradient(135deg, rgba(0,222,218,0.18) 0%, rgba(150,236,171,0.12) 100%)",
        }}
      >
        {initials(player.name)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={player.name}
      title={player.name}
      onError={() => setErrored(true)}
      className={`${sizeCls} ${className} shrink-0 rounded-full border border-cyan-bright/25 object-cover`}
    />
  );
}
