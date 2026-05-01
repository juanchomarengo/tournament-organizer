"use client";

import { useState } from "react";
import Link from "next/link";
import { postAction, deleteAction } from "@/lib/client";
import { Button, Card, Badge } from "@/components/ui";
import { teamLabel } from "@/lib/draw";
import type { Tournament } from "@/lib/types";

interface Props {
  tournament: Tournament;
  refresh: () => Promise<void>;
}

export function PairsStage({ tournament, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const players = tournament.players;
  const intermedios = players.filter((p) => p.level === "intermedio").length;
  const principiantes = players.filter((p) => p.level === "principiante").length;
  const isReady = intermedios === principiantes && intermedios > 0;

  async function drawPairsAction() {
    setBusy(true);
    setError(null);
    try {
      await postAction("/api/draw/pairs");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function resetPairs() {
    if (!confirm("Volver a sortear las parejas? Se borran los grupos y partidos.")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAction("/api/draw/pairs");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  if (tournament.state === "setup") {
    return (
      <Card>
        <h2 className="text-display text-xl font-semibold">Sorteo de parejas</h2>
        <p className="mt-1 text-sm text-muted">
          Cada pareja se forma con 1 Intermedio + 1 Principiante.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={drawPairsAction} disabled={busy || !isReady}>
            {busy ? "Sorteando…" : "Sortear parejas"}
          </Button>
          <Link
            href="/sorteo?present=1"
            target="_blank"
            className="text-sm text-cyan-bright hover:underline"
          >
            Proyectar sorteo ↗
          </Link>
          <Link
            href="/sorteo"
            target="_blank"
            className="text-sm text-muted hover:text-foreground"
          >
            Vista previa
          </Link>
        </div>
        {!isReady && (
          <p className="mt-3 text-xs text-muted">
            Asegurate de tener misma cantidad de Intermedios y Principiantes y un mínimo de 4 jugadores.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </Card>
    );
  }

  // pairs_drawn o más adelante — mostrar parejas
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold">Parejas</h2>
          <p className="text-sm text-muted">
            {tournament.teams.length} parejas armadas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sorteo?present=1"
            target="_blank"
            className="text-sm text-cyan-bright hover:underline"
          >
            Proyectar ↗
          </Link>
          <Link
            href="/sorteo"
            target="_blank"
            className="text-sm text-muted hover:text-foreground"
          >
            Vista previa
          </Link>
          {tournament.state === "pairs_drawn" && (
            <Button variant="danger" onClick={resetPairs} disabled={busy}>
              Re-sortear
            </Button>
          )}
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {tournament.teams.map((t, i) => (
          <li
            key={t.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <Badge color="muted">P{i + 1}</Badge>
            <span className="truncate font-medium">{teamLabel(t, players)}</span>
            {t.groupId && <Badge color="violet">{t.groupId}</Badge>}
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}
