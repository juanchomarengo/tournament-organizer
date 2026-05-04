"use client";

import { useState, useMemo } from "react";
import { Button, Input, Select } from "@/components/ui";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { teamLabel } from "@/lib/draw";
import type { Level, Player, Team, Tournament } from "@/lib/types";

interface Props {
  tournament: Tournament;
  team: Team;
  onClose: () => void;
  onSave: (next: Tournament) => Promise<void>;
}

type SlotChoice =
  | { kind: "keep" }
  | { kind: "existing"; playerId: string }
  | { kind: "new"; name: string; level: Level };

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function EditTeamModal({ tournament, team, onClose, onSave }: Props) {
  const teamIndex = tournament.teams.findIndex((t) => t.id === team.id);
  const [slot0, setSlot0] = useState<SlotChoice>({ kind: "keep" });
  const [slot1, setSlot1] = useState<SlotChoice>({ kind: "keep" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerById = useMemo(
    () => Object.fromEntries(tournament.players.map((p) => [p.id, p])),
    [tournament.players],
  );
  const teamOfPlayer = useMemo(() => {
    const map: Record<string, { team: Team; index: number; slot: 0 | 1 }> = {};
    tournament.teams.forEach((t, idx) => {
      t.playerIds.forEach((pid, slot) => {
        map[pid] = { team: t, index: idx, slot: slot as 0 | 1 };
      });
    });
    return map;
  }, [tournament.teams]);

  function describePreview(slot: SlotChoice, currentPlayerId: string): string {
    if (slot.kind === "keep") return playerById[currentPlayerId]?.name ?? "?";
    if (slot.kind === "new") return slot.name || "(nuevo)";
    return playerById[slot.playerId]?.name ?? "?";
  }

  // Detectar swaps: si slot.existing es un playerId que YA está en otra pareja
  const swapWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const [slot, choice] of [
      [0, slot0],
      [1, slot1],
    ] as const) {
      if (choice.kind !== "existing") continue;
      const existing = teamOfPlayer[choice.playerId];
      if (!existing) continue;
      if (existing.team.id === team.id) continue; // mismo team, ok
      const otherPlayer = playerById[team.playerIds[slot]];
      warnings.push(
        `${playerById[choice.playerId]?.name ?? "?"} está en P${existing.index + 1}. ${
          otherPlayer?.name ?? "?"
        } pasa a esa pareja como reemplazo.`,
      );
    }
    return warnings;
  }, [slot0, slot1, teamOfPlayer, team, playerById]);

  async function applyChanges() {
    setBusy(true);
    setError(null);
    try {
      // Mutaciones planificadas
      const next: Tournament = {
        ...tournament,
        players: [...tournament.players],
        teams: tournament.teams.map((t) => ({ ...t, playerIds: [...t.playerIds] as [string, string] })),
      };

      function applyToSlot(slot: 0 | 1, choice: SlotChoice) {
        if (choice.kind === "keep") return;

        const myTeam = next.teams.find((t) => t.id === team.id)!;
        const oldPlayerId = myTeam.playerIds[slot];

        if (choice.kind === "new") {
          if (!choice.name.trim()) throw new Error("Nombre vacío para jugador nuevo");
          // Agregar el nuevo player a la lista
          const newPlayer: Player = {
            id: newId("p"),
            name: choice.name.trim(),
            level: choice.level,
          };
          next.players.push(newPlayer);
          myTeam.playerIds[slot] = newPlayer.id;
          return;
        }

        // existing
        const newPlayerId = choice.playerId;
        const otherTeamIdx = next.teams.findIndex((t) =>
          t.playerIds.includes(newPlayerId) && t.id !== team.id,
        );
        if (otherTeamIdx === -1) {
          // El jugador no está en ninguna otra pareja (ej: reemplazo simple)
          myTeam.playerIds[slot] = newPlayerId;
          return;
        }
        // Está en otra pareja → swap
        const otherTeam = next.teams[otherTeamIdx];
        const otherSlot = otherTeam.playerIds.indexOf(newPlayerId) as 0 | 1;
        otherTeam.playerIds[otherSlot] = oldPlayerId;
        myTeam.playerIds[slot] = newPlayerId;
      }

      applyToSlot(0, slot0);
      applyToSlot(1, slot1);

      await onSave(next);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const dirty = slot0.kind !== "keep" || slot1.kind !== "keep";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-cyan-bright/30 bg-navy-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>

        <h3 className="text-display text-xl font-semibold">
          Editar pareja P{teamIndex + 1}
        </h3>
        <p className="mt-1 text-sm text-muted">
          Actual: {teamLabel(team, tournament.players)}
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <SlotEditor
            label="Jugador 1"
            currentPlayerId={team.playerIds[0]}
            choice={slot0}
            onChange={setSlot0}
            tournament={tournament}
            otherSlotChoice={slot1}
            currentTeamId={team.id}
          />
          <SlotEditor
            label="Jugador 2"
            currentPlayerId={team.playerIds[1]}
            choice={slot1}
            onChange={setSlot1}
            tournament={tournament}
            otherSlotChoice={slot0}
            currentTeamId={team.id}
          />
        </div>

        <div className="mt-5 rounded-lg border border-cyan-bright/20 bg-cyan-bright/[0.05] p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.15em] text-cyan-bright mb-1">Resultado</p>
          <p>
            {describePreview(slot0, team.playerIds[0])} & {describePreview(slot1, team.playerIds[1])}
          </p>
        </div>

        {swapWarnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-200 space-y-1">
            {swapWarnings.map((w, i) => (
              <p key={i}>↔ {w}</p>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-rose-300">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={applyChanges} disabled={busy || !dirty}>
            {busy ? "Guardando…" : "Aplicar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SlotEditor({
  label,
  currentPlayerId,
  choice,
  onChange,
  tournament,
  otherSlotChoice,
  currentTeamId,
}: {
  label: string;
  currentPlayerId: string;
  choice: SlotChoice;
  onChange: (c: SlotChoice) => void;
  tournament: Tournament;
  otherSlotChoice: SlotChoice;
  currentTeamId: string;
}) {
  const currentPlayer = tournament.players.find((p) => p.id === currentPlayerId);

  // No permitir elegir el mismo jugador en los 2 slots
  const blockedByOther =
    otherSlotChoice.kind === "existing" ? otherSlotChoice.playerId : null;

  const teamOfPlayer = useMemo(() => {
    const map: Record<string, { teamIndex: number }> = {};
    tournament.teams.forEach((t, idx) => {
      t.playerIds.forEach((pid) => {
        if (t.id !== currentTeamId) {
          map[pid] = { teamIndex: idx };
        }
      });
    });
    return map;
  }, [tournament.teams, currentTeamId]);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.15em] text-muted mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        <PlayerAvatar
          player={
            choice.kind === "keep"
              ? currentPlayer
              : choice.kind === "existing"
                ? tournament.players.find((p) => p.id === choice.playerId)
                : { name: choice.name || "?" }
          }
          size="md"
        />
        <Select
          className="flex-1"
          value={
            choice.kind === "keep"
              ? `keep`
              : choice.kind === "new"
                ? `__new__`
                : `existing:${choice.playerId}`
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "keep") onChange({ kind: "keep" });
            else if (v === "__new__") onChange({ kind: "new", name: "", level: "principiante" });
            else onChange({ kind: "existing", playerId: v.replace(/^existing:/, "") });
          }}
        >
          <option value="keep">
            Mantener: {currentPlayer?.name ?? "?"}
          </option>
          <optgroup label="Cambiar a un jugador existente">
            {tournament.players
              .filter((p) => p.id !== currentPlayerId && p.id !== blockedByOther)
              .map((p) => {
                const inTeam = teamOfPlayer[p.id];
                const suffix = inTeam ? ` (en P${inTeam.teamIndex + 1})` : " (libre)";
                return (
                  <option key={p.id} value={`existing:${p.id}`}>
                    {p.name}
                    {suffix}
                  </option>
                );
              })}
          </optgroup>
          <option value="__new__">+ Crear jugador nuevo</option>
        </Select>
      </div>

      {choice.kind === "new" && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            placeholder="Nombre del nuevo jugador"
            value={choice.name}
            onChange={(e) => onChange({ ...choice, name: e.target.value })}
            className="flex-1 min-w-[180px]"
            autoFocus
          />
          <Select
            value={choice.level}
            onChange={(e) =>
              onChange({ ...choice, level: e.target.value as Level })
            }
          >
            <option value="intermedio">Intermedio</option>
            <option value="principiante">Principiante</option>
          </Select>
        </div>
      )}
    </div>
  );
}
