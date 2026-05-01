"use client";

import { useState, useEffect } from "react";
import { Button, Badge, Input } from "@/components/ui";
import { teamLabel } from "@/lib/draw";
import type { Match, Team, Player, Score } from "@/lib/types";

interface Props {
  match: Match;
  teams: Team[];
  players: Player[];
  onSave: (
    matchId: string,
    payload: { score: Score | null; winner: string | null; status: Match["status"] },
  ) => Promise<void>;
}

function emptyScore(): Score {
  return { setsA: 0, setsB: 0, gamesA: 0, gamesB: 0 };
}

export function MatchRow({ match, teams, players, onSave }: Props) {
  const teamA = teams.find((t) => t.id === match.teamA);
  const teamB = teams.find((t) => t.id === match.teamB);
  const ready = !!teamA && !!teamB;

  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState<Score>(match.score ?? emptyScore());
  const [winner, setWinner] = useState<string | null>(match.winner);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setScore(match.score ?? emptyScore());
    setWinner(match.winner);
  }, [match.id, match.score, match.winner]);

  async function close() {
    if (!winner || !teamA || !teamB) return;
    setBusy(true);
    try {
      await onSave(match.id, { score, winner, status: "done" });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    try {
      await onSave(match.id, { score: null, winner: null, status: "pending" });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge color={match.status === "done" ? "cyan" : "muted"}>
            {match.label ?? match.phase}
          </Badge>
          <Badge color="muted">Ronda {match.round}</Badge>
          {match.court && <Badge color="muted">Cancha {match.court}</Badge>}
          {match.status === "done" && <Badge color="violet">Cerrado</Badge>}
        </div>
        <div className="flex gap-1">
          {match.status === "done" ? (
            <Button variant="ghost" onClick={reopen} disabled={busy}>
              Reabrir
            </Button>
          ) : (
            ready && (
              <Button onClick={() => setEditing((v) => !v)} disabled={busy}>
                {editing ? "Cerrar editor" : "Cargar resultado"}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TeamLine
          team={teamA}
          players={players}
          isWinner={match.winner === match.teamA && match.status === "done"}
        />
        <TeamLine
          team={teamB}
          players={players}
          isWinner={match.winner === match.teamB && match.status === "done"}
        />
      </div>

      {match.status === "done" && match.score && (
        <div className="mt-2 text-xs text-muted">
          Sets {match.score.setsA}-{match.score.setsB} · Games {match.score.gamesA}-{match.score.gamesB}
        </div>
      )}

      {editing && ready && (() => {
        const setsLeader =
          score.setsA > score.setsB ? teamA?.id : score.setsB > score.setsA ? teamB?.id : null;
        const gamesLeader =
          score.gamesA > score.gamesB ? teamA?.id : score.gamesB > score.gamesA ? teamB?.id : null;
        const someScore = score.setsA + score.setsB + score.gamesA + score.gamesB > 0;
        const winnerMismatch =
          someScore && winner !== null && setsLeader !== null && winner !== setsLeader;
        const winnerVsGames =
          someScore && winner !== null && gamesLeader !== null && winner !== gamesLeader;
        return (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-cyan-bright/20 bg-cyan-bright/5 p-3">
          <div className="grid grid-cols-2 gap-3">
            <ScoreFields
              labelA="Sets A"
              labelB="Sets B"
              valueA={score.setsA}
              valueB={score.setsB}
              onChangeA={(v) => setScore({ ...score, setsA: v })}
              onChangeB={(v) => setScore({ ...score, setsB: v })}
            />
            <ScoreFields
              labelA="Games A"
              labelB="Games B"
              valueA={score.gamesA}
              valueB={score.gamesB}
              onChangeA={(v) => setScore({ ...score, gamesA: v })}
              onChangeB={(v) => setScore({ ...score, gamesB: v })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-muted">Ganador</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setWinner(teamA!.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  winner === teamA!.id
                    ? "bg-cyan-bright text-navy-950"
                    : "border border-white/10 text-muted hover:bg-white/5"
                }`}
              >
                {teamLabel(teamA, players)}
              </button>
              <button
                onClick={() => setWinner(teamB!.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  winner === teamB!.id
                    ? "bg-cyan-bright text-navy-950"
                    : "border border-white/10 text-muted hover:bg-white/5"
                }`}
              >
                {teamLabel(teamB, players)}
              </button>
            </div>
          </div>
          {(winnerMismatch || winnerVsGames) && (
            <div className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
              ⚠ El ganador elegido no coincide con quien tiene más{" "}
              {winnerMismatch ? "sets" : "games"}. ¿Es correcto?
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={close} disabled={busy || !winner}>
              {busy ? "Guardando…" : "Cerrar partido"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function TeamLine({
  team,
  players,
  isWinner,
}: {
  team: Team | undefined;
  players: Player[];
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
        isWinner ? "bg-cyan-bright/15 text-cyan-bright" : "text-foreground"
      }`}
    >
      {isWinner && <span className="text-xs">★</span>}
      <span className="truncate">{team ? teamLabel(team, players) : "Por definir"}</span>
    </div>
  );
}

function ScoreFields({
  labelA,
  labelB,
  valueA,
  valueB,
  onChangeA,
  onChangeB,
}: {
  labelA: string;
  labelB: string;
  valueA: number;
  valueB: number;
  onChangeA: (v: number) => void;
  onChangeB: (v: number) => void;
}) {
  return (
    <div className="flex gap-2">
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
        {labelA}
        <Input
          type="number"
          min={0}
          value={valueA}
          onChange={(e) => onChangeA(Number(e.target.value) || 0)}
        />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
        {labelB}
        <Input
          type="number"
          min={0}
          value={valueB}
          onChange={(e) => onChangeB(Number(e.target.value) || 0)}
        />
      </label>
    </div>
  );
}
