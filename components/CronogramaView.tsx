"use client";

import { useTournament } from "@/lib/client";
import { Card, Badge } from "@/components/ui";
import { teamLabel } from "@/lib/draw";
import type { Match, Team, Player } from "@/lib/types";

const ROUND_TIMES: Record<number, string> = {
  1: "18:30",
  2: "18:45",
  3: "19:00",
  4: "19:15",
  5: "19:30",
  6: "19:45",
};

export function CronogramaView() {
  const { tournament, loading } = useTournament(5000);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-muted">Cargando…</p>
      </main>
    );
  }

  if (tournament.matches.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-bright">Cronograma</p>
        <h1 className="text-display text-4xl sm:text-6xl font-bold glow-text">
          Aparece cuando se sortee el bracket
        </h1>
        <p className="mt-4 max-w-lg text-muted">
          Cuatro canchas, rondas de 15 minutos. Inicio: miércoles 6 de mayo, 18:30.
        </p>
      </main>
    );
  }

  const byRound = new Map<number, Match[]>();
  for (const m of tournament.matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }

  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  // Ronda activa: la primera con al menos un partido no-done (y al menos un done si es una ronda > 1, o ninguna anterior pendiente)
  const activeRound = rounds.find((r) => {
    const matches = byRound.get(r)!;
    return matches.some((m) => m.status !== "done");
  }) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-bright">Cronograma</p>
        <h1 className="text-display text-3xl sm:text-4xl font-bold">
          Pilar Padel Center · 4 canchas
        </h1>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.15em] text-muted">
              <th className="px-4 py-3 w-32">Ronda</th>
              <th className="px-4 py-3">Cancha 1</th>
              <th className="px-4 py-3">Cancha 2</th>
              <th className="px-4 py-3">Cancha 3</th>
              <th className="px-4 py-3">Cancha 4</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => {
              const matches = byRound.get(round)!;
              const isActive = round === activeRound;
              const isDone = matches.every((m) => m.status === "done");
              return (
                <tr
                  key={round}
                  className={`border-b border-white/5 last:border-0 ${
                    isActive ? "bg-cyan-bright/5" : ""
                  }`}
                >
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-display text-lg font-semibold ${
                          isActive ? "text-cyan-bright" : ""
                        }`}
                      >
                        R{round}
                      </span>
                      <span className="text-xs text-muted">{ROUND_TIMES[round] ?? "—"}</span>
                      {isActive && (
                        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-cyan-bright/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-cyan-bright">
                          <span className="size-1.5 rounded-full bg-cyan-bright animate-pulse" />
                          En curso
                        </span>
                      )}
                      {isDone && !isActive && (
                        <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted">
                          Cerrada
                        </span>
                      )}
                    </div>
                  </td>
                  {[1, 2, 3, 4].map((court) => {
                    const m = matches.find((mm) => mm.court === court);
                    return (
                      <td key={court} className="px-3 py-3 align-top">
                        {m ? (
                          <CronoCell
                            match={m}
                            teams={tournament.teams}
                            players={tournament.players}
                          />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </main>
  );
}

function CronoCell({
  match,
  teams,
  players,
}: {
  match: Match;
  teams: Team[];
  players: Player[];
}) {
  const a = teams.find((t) => t.id === match.teamA);
  const b = teams.find((t) => t.id === match.teamB);
  const done = match.status === "done";
  const winnerA = done && match.winner === match.teamA;
  const winnerB = done && match.winner === match.teamB;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <Badge color={done ? "cyan" : "muted"}>{match.label ?? match.phase}</Badge>
        {done && match.score && (
          <span className="text-xs text-muted">
            {match.score.gamesA}-{match.score.gamesB}
          </span>
        )}
      </div>
      <span className={`truncate text-sm ${winnerA ? "text-cyan-bright font-medium" : ""}`}>
        {a ? teamLabel(a, players) : "—"}
      </span>
      <span className={`truncate text-sm ${winnerB ? "text-cyan-bright font-medium" : ""}`}>
        {b ? teamLabel(b, players) : "—"}
      </span>
    </div>
  );
}
