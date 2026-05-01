"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tournament } from "./types";
import { EMPTY_TOURNAMENT } from "./types";

export async function fetchTournament(): Promise<Tournament> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) throw new Error("failed to fetch state");
  return res.json();
}

export async function saveTournament(t: Tournament): Promise<void> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "save failed");
  }
}

export async function postAction(path: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `request failed (${res.status})`);
  }
}

export async function deleteAction(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `request failed (${res.status})`);
  }
}

export async function login(password: string): Promise<boolean> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}

const LOCAL_BACKUP = "sirius-padel:backup";

export function backupToLocal(t: Tournament): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_BACKUP, JSON.stringify(t));
  } catch {
    /* noop */
  }
}

export function readLocalBackup(): Tournament | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_BACKUP);
    return raw ? (JSON.parse(raw) as Tournament) : null;
  } catch {
    return null;
  }
}

export function useTournament(pollMs = 0): {
  tournament: Tournament;
  refresh: () => Promise<void>;
  loading: boolean;
} {
  const [tournament, setTournament] = useState<Tournament>(EMPTY_TOURNAMENT);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const t = await fetchTournament();
      if (mounted.current) setTournament(t);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    if (pollMs <= 0) {
      return () => {
        mounted.current = false;
      };
    }
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(refresh, pollMs);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    if (typeof document === "undefined" || !document.hidden) start();
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refresh();
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, pollMs]);

  return { tournament, refresh, loading };
}
