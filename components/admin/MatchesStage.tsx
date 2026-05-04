"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { MatchRow } from "./MatchRow";
import type { Tournament, Match, Score } from "@/lib/types";

interface Props {
  tournament: Tournament;
  refresh: () => Promise<void>;
}

export function MatchesStage({ tournament, refresh }: Props) {
  const [error, setError] = useState<string | null>(null);

  if (tournament.matches.length === 0) return null;

  async function saveMatch(
    matchId: string,
    payload: { score: Score | null; winner: string | null; status: Match["status"] },
  ) {
    setError(null);
    const res = await fetch(`/api/match/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "error");
      return;
    }
    await refresh();
  }

  const byRound = new Map<number, Match[]>();
  for (const m of tournament.matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }

  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  const activeRound = rounds.find((r) =>
    byRound.get(r)!.some((m) => m.status !== "done"),
  ) ?? null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold">Partidos</h2>
          <p className="text-sm text-muted">
            Cargá el resultado a medida que termina cada partido. Las semis se completan solas cuando cierran los grupos.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5">
        {rounds.map((round) => {
          const matches = byRound.get(round)!.sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
          const phase = matches[0]?.phase;
          const isActive = round === activeRound;
          return (
            <div
              key={round}
              className={isActive ? "rounded-xl border border-cyan-bright/30 bg-cyan-bright/[0.03] p-3 -m-3" : ""}
            >
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
                <Badge color={isActive ? "cyan" : phase === "groups" ? "violet" : "muted"}>
                  Ronda {round}
                </Badge>
                <span>{labelForPhase(phase)}</span>
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-cyan-bright normal-case tracking-normal">
                    <span className="size-1.5 rounded-full bg-cyan-bright animate-pulse" />
                    en curso
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    teams={tournament.teams}
                    players={tournament.players}
                    showSets={
                      tournament.config.durationMode === "by-set" &&
                      tournament.config.matchFormat === "best-of-3"
                    }
                    onSave={saveMatch}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function labelForPhase(phase: Match["phase"] | undefined): string {
  switch (phase) {
    case "groups":
      return "Fase de grupos";
    case "semis":
      return "Semifinales";
    case "final":
      return "Final";
    case "third":
      return "3er puesto";
    default:
      return "";
  }
}
