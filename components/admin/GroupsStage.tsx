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

export function GroupsStage({ tournament, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tournament.state === "pairs_drawn") {
    const teamsCount = tournament.teams.length;
    const ready = teamsCount >= 4;
    let groupCount: 1 | 2 | 4 = 4;
    if (teamsCount <= 5) groupCount = 1;
    else if (teamsCount <= 10) groupCount = 2;
    let format = "1 grupo (todos contra todos) + final";
    if (groupCount === 2) format = "2 grupos + semis cruzadas + final";
    if (groupCount === 4) format = "4 grupos + semis + final";
    return (
      <Card>
        <h2 className="text-display text-xl font-semibold">Sorteo de grupos</h2>
        <p className="mt-1 text-sm text-muted">
          {teamsCount} parejas → <span className="text-foreground">{format}</span>. Los partidos se
          schedulean en {tournament.config.courts} cancha{tournament.config.courts === 1 ? "" : "s"}.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await postAction("/api/draw/groups");
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "error");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !ready}
          >
            {busy ? "Sorteando…" : "Sortear grupos y bracket"}
          </Button>
        </div>
        {!ready && (
          <p className="mt-3 text-xs text-muted">
            Necesitás al menos 4 parejas. Hay {teamsCount}.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </Card>
    );
  }

  if (tournament.groups.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold">Grupos</h2>
          <p className="text-sm text-muted">Cada grupo juega todos contra todos en su cancha.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/bracket?present=1"
            target="_blank"
            className="text-sm text-cyan-bright hover:underline"
          >
            Proyectar bracket ↗
          </Link>
          <Link
            href="/bracket"
            target="_blank"
            className="text-sm text-muted hover:text-foreground"
          >
            Vista previa
          </Link>
          {tournament.state === "bracket_drawn" && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirm("Re-sortear grupos? Se borran los partidos cargados.")) return;
                setBusy(true);
                setError(null);
                try {
                  await deleteAction("/api/draw/groups");
                  await refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "error");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Re-sortear grupos
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tournament.groups.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-display text-lg font-semibold">Grupo {g.id}</span>
              <Badge color="muted">{g.teamIds.length} parejas</Badge>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {g.teamIds.map((teamId) => {
                const team = tournament.teams.find((t) => t.id === teamId);
                return (
                  <li key={teamId} className="text-foreground/90">
                    {teamLabel(team, tournament.players)}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}
