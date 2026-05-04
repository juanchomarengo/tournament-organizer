"use client";

import { useState } from "react";
import type { Player, Tournament, Level } from "@/lib/types";
import { Button, Card, Input, Select, Badge } from "@/components/ui";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { seedPlayers } from "@/lib/seed";

interface Props {
  tournament: Tournament;
  onChange: (next: Tournament) => Promise<void>;
}

function newId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function PlayersSection({ tournament, onChange }: Props) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level>("intermedio");
  const [busy, setBusy] = useState(false);

  const players = tournament.players;
  const intermedios = players.filter((p) => p.level === "intermedio").length;
  const principiantes = players.filter((p) => p.level === "principiante").length;
  const total = players.length;
  const isEven = total > 0 && total % 2 === 0;
  const isBalanced = intermedios === principiantes;
  const canDraw = isEven && total >= 4;
  const mixedPairs = Math.min(intermedios, principiantes);
  const sameLevelPairs = canDraw ? (total - mixedPairs * 2) / 2 : 0;

  async function addPlayer() {
    if (!name.trim()) return;
    setBusy(true);
    const next: Tournament = {
      ...tournament,
      players: [
        ...players,
        { id: newId(), name: name.trim(), level },
      ],
    };
    await onChange(next);
    setName("");
    setBusy(false);
  }

  async function removePlayer(id: string) {
    setBusy(true);
    await onChange({
      ...tournament,
      players: players.filter((p) => p.id !== id),
    });
    setBusy(false);
  }

  async function toggleLevel(p: Player) {
    setBusy(true);
    await onChange({
      ...tournament,
      players: players.map((x) =>
        x.id === p.id
          ? { ...x, level: x.level === "intermedio" ? "principiante" : "intermedio" }
          : x,
      ),
    });
    setBusy(false);
  }

  async function loadSeed() {
    if (players.length > 0 && !confirm("Reemplazar la lista actual por la semilla?")) return;
    setBusy(true);
    await onChange({
      ...tournament,
      players: seedPlayers(),
    });
    setBusy(false);
  }

  async function clearAll() {
    if (!confirm("Borrar todos los jugadores?")) return;
    setBusy(true);
    await onChange({ ...tournament, players: [] });
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold">Jugadores</h2>
          <p className="text-sm text-muted">
            Total par y mínimo 4. El sorteo arma 1 Int + 1 Prin mientras alcance; los sobrantes se emparejan entre sí.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={total === 0 ? "muted" : isEven ? "cyan" : "pink"}>
            {total} en total {isEven ? "(par)" : "(impar)"}
          </Badge>
          <Badge color="muted">Int {intermedios} · Prin {principiantes}</Badge>
          {canDraw && (
            <Badge color="cyan">
              {isBalanced
                ? "Listo para sortear"
                : `${mixedPairs} mixtas + ${sameLevelPairs} mismo nivel`}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-stretch gap-2">
        <Input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPlayer();
            }
          }}
          className="flex-1 min-w-[180px]"
        />
        <Select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          <option value="intermedio">Intermedio</option>
          <option value="principiante">Principiante</option>
        </Select>
        <Button onClick={addPlayer} disabled={busy || !name.trim()}>
          Agregar
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={loadSeed} disabled={busy}>
          Cargar lista inicial (26)
        </Button>
        {players.length > 0 && (
          <Button variant="danger" onClick={clearAll} disabled={busy}>
            Borrar todos
          </Button>
        )}
      </div>

      {players.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PlayerAvatar player={p} size="sm" />
                <span className="truncate font-medium">{p.name}</span>
                <span
                  className={`size-1.5 rounded-full shrink-0 ${
                    p.level === "intermedio" ? "bg-cyan-bright" : "bg-sirius-violet"
                  }`}
                  title={p.level === "intermedio" ? "Intermedio" : "Principiante"}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleLevel(p)}
                  className="rounded-md px-2 py-0.5 text-xs text-muted hover:bg-white/5 hover:text-foreground"
                  disabled={busy}
                  title="Cambiar nivel"
                >
                  {p.level === "intermedio" ? "Int" : "Prin"}
                </button>
                <button
                  onClick={() => removePlayer(p.id)}
                  className="rounded-md px-2 py-0.5 text-xs text-rose-300 hover:bg-rose-400/10"
                  disabled={busy}
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
