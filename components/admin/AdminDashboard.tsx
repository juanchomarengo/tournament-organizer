"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTournament, useTournament, logout, backupToLocal } from "@/lib/client";
import { Button, Badge } from "@/components/ui";
import { PlayersSection } from "./PlayersSection";
import { PairsStage } from "./PairsStage";
import { GroupsStage } from "./GroupsStage";
import { MatchesStage } from "./MatchesStage";
import { DataSection } from "./DataSection";
import type { Tournament, TournamentStateName } from "@/lib/types";

const STATE_LABELS: Record<TournamentStateName, { label: string; color: "muted" | "cyan" | "violet" | "pink" }> = {
  setup: { label: "Setup", color: "muted" },
  pairs_drawn: { label: "Parejas sorteadas", color: "cyan" },
  bracket_drawn: { label: "Bracket armado", color: "violet" },
  running: { label: "En juego", color: "violet" },
  finished: { label: "Finalizado", color: "pink" },
};

export function AdminDashboard() {
  const router = useRouter();
  const { tournament, refresh, loading } = useTournament();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    async (next: Tournament) => {
      setSaving(true);
      setError(null);
      try {
        await saveTournament(next);
        backupToLocal(next);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "error guardando");
      } finally {
        setSaving(false);
      }
    },
    [refresh],
  );

  async function onLogout() {
    await logout();
    router.refresh();
  }

  const stateInfo = STATE_LABELS[tournament.state];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-bright">Backoffice</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display text-3xl font-bold">Panel del torneo</h1>
            <Badge color={stateInfo.color}>{stateInfo.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted">guardando…</span>}
          <Button variant="ghost" onClick={onLogout}>
            Salir
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {tournament.state === "setup" && (
            <PlayersSection tournament={tournament} onChange={update} />
          )}
          <PairsStage tournament={tournament} refresh={refresh} />
          {(tournament.state === "pairs_drawn" ||
            tournament.state === "bracket_drawn" ||
            tournament.state === "running" ||
            tournament.state === "finished") && (
            <GroupsStage tournament={tournament} refresh={refresh} />
          )}
          {(tournament.state === "bracket_drawn" ||
            tournament.state === "running" ||
            tournament.state === "finished") && (
            <MatchesStage tournament={tournament} refresh={refresh} />
          )}
          <DataSection tournament={tournament} refresh={refresh} />
        </div>
      )}
    </div>
  );
}
