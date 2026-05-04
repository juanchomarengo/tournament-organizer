"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { calculatePlan, estimateMatchMinutes, formatMinutes } from "@/lib/estimator";
import type {
  DurationMode,
  MatchFormat,
  PreferredGroupCount,
  Tournament,
  TournamentConfig,
} from "@/lib/types";

interface Props {
  tournament: Tournament;
  onChange: (next: Tournament) => Promise<void>;
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export function ConfigSection({ tournament, onChange }: Props) {
  const [draft, setDraft] = useState<TournamentConfig>(tournament.config);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(tournament.config);
  }, [tournament.config]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(tournament.config);

  // Cantidad de parejas estimada: si ya hay teams, usamos esa cantidad. Si no, players/2.
  const teamsCount =
    tournament.teams.length > 0
      ? tournament.teams.length
      : Math.floor(tournament.players.length / 2);

  const plan = useMemo(
    () =>
      teamsCount >= 4
        ? calculatePlan(teamsCount, draft.courts, draft.preferredGroupCount)
        : null,
    [teamsCount, draft.courts, draft.preferredGroupCount],
  );

  // Preview de las opciones de groupCount disponibles según parejas
  const groupCountOptions = useMemo(() => {
    if (teamsCount < 4) return [];
    const opts: Array<{ value: PreferredGroupCount; label: string; plan: ReturnType<typeof calculatePlan> }> = [
      { value: "auto", label: "Automático", plan: calculatePlan(teamsCount, draft.courts, "auto") },
    ];
    for (const n of [1, 2, 4] as const) {
      if (teamsCount >= n * 2) {
        opts.push({
          value: n,
          label: `${n} grupo${n === 1 ? "" : "s"}`,
          plan: calculatePlan(teamsCount, draft.courts, n),
        });
      }
    }
    return opts;
  }, [teamsCount, draft.courts]);

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await onChange({ ...tournament, config: draft });
      setMsg("Configuración guardada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "error guardando");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDraft(tournament.config);
    setMsg(null);
    setError(null);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-display text-xl font-semibold">Configuración</h2>
          <p className="text-sm text-muted">
            Reglas del torneo. El panel calcula y avisa si fitea con el tiempo reservado.
          </p>
        </div>
        {dirty && <span className="text-xs text-amber-200">Cambios sin guardar</span>}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Canchas en simultáneo">
          <Select
            value={draft.courts}
            onChange={(e) => setDraft({ ...draft, courts: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "cancha" : "canchas"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tiempo reservado">
          <Select
            value={draft.totalReservedMinutes}
            onChange={(e) =>
              setDraft({ ...draft, totalReservedMinutes: Number(e.target.value) })
            }
          >
            {[60, 75, 90, 105, 120, 150, 180, 240].map((n) => (
              <option key={n} value={n}>
                {formatMinutes(n)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cantidad de grupos">
          <Select
            value={String(draft.preferredGroupCount)}
            onChange={(e) => {
              const v = e.target.value;
              setDraft({
                ...draft,
                preferredGroupCount:
                  v === "auto" ? "auto" : (Number(v) as 1 | 2 | 4),
              });
            }}
          >
            <option value="auto">Automático (heurística)</option>
            <option value="1">1 grupo (round-robin completo)</option>
            <option value="2">2 grupos (semis cruzadas)</option>
            <option value="4">4 grupos (Final Four clásico)</option>
          </Select>
        </Field>

        <Field label="Modo de duración">
          <Select
            value={draft.durationMode}
            onChange={(e) =>
              setDraft({ ...draft, durationMode: e.target.value as DurationMode })
            }
          >
            <option value="by-time">Por tiempo (cada partido dura X min)</option>
            <option value="by-set">Por sets/games (cada partido se juega hasta cerrar)</option>
          </Select>
        </Field>

        {draft.durationMode === "by-set" && (
          <Field label="Formato de partido">
            <Select
              value={draft.matchFormat}
              onChange={(e) =>
                setDraft({ ...draft, matchFormat: e.target.value as MatchFormat })
              }
            >
              <option value="single-set">A 1 set (~25 min)</option>
              <option value="best-of-3">Mejor de 3 sets (~60 min)</option>
            </Select>
          </Field>
        )}

        <Field label="Inicio del evento">
          <Input
            type="datetime-local"
            value={isoToLocalInput(draft.eventStart)}
            onChange={(e) =>
              setDraft({ ...draft, eventStart: localInputToIso(e.target.value) })
            }
          />
        </Field>

        <Field label="Lugar">
          <Input
            value={draft.eventLocation}
            onChange={(e) => setDraft({ ...draft, eventLocation: e.target.value })}
          />
        </Field>

        <Field label="Premio">
          <Input
            value={draft.prizeText}
            onChange={(e) => setDraft({ ...draft, prizeText: e.target.value })}
          />
        </Field>
      </div>

      <PlanPreview teamsCount={teamsCount} config={draft} plan={plan} />
      {groupCountOptions.length > 1 && teamsCount >= 4 && (
        <GroupCountCompare config={draft} options={groupCountOptions} />
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy || !dirty}>
          {busy ? "Guardando…" : "Guardar configuración"}
        </Button>
        {dirty && (
          <Button variant="ghost" onClick={reset} disabled={busy}>
            Descartar
          </Button>
        )}
      </div>

      {msg && <p className="mt-3 text-sm text-cyan-bright">{msg}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}

function PlanPreview({
  teamsCount,
  config,
  plan,
}: {
  teamsCount: number;
  config: TournamentConfig;
  plan: ReturnType<typeof calculatePlan> | null;
}) {
  if (teamsCount < 4 || !plan) {
    return (
      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-muted">
        Cargá al menos 4 jugadores (2 parejas) para ver la estimación.
      </div>
    );
  }

  const { totalMatches, totalRounds, groupCount, sizes } = plan;
  const formatLabel =
    groupCount === 1
      ? `1 grupo de ${sizes[0]} → final directa`
      : groupCount === 2
        ? `2 grupos (${sizes.join(" + ")}) → semis cruzadas + final + 3°`
        : `4 grupos (${sizes.join(", ")}) → semis + final + 3°`;

  if (config.durationMode === "by-time") {
    const minutesPerRound = config.totalReservedMinutes / totalRounds;
    const fits = minutesPerRound >= 8;
    return (
      <div
        className={`mt-5 rounded-lg border p-4 text-sm ${
          fits
            ? "border-cyan-bright/30 bg-cyan-bright/[0.05]"
            : "border-amber-300/30 bg-amber-300/[0.05]"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-bright mb-2">
          Estimación
        </p>
        <p>
          <span className="font-semibold">{teamsCount} parejas</span> · {formatLabel}
        </p>
        <p className="mt-1 text-muted">
          {totalMatches} partidos · {totalRounds} rondas · {config.courts} cancha
          {config.courts === 1 ? "" : "s"}
        </p>
        <p className="mt-3">
          Cada partido dura{" "}
          <span
            className={`text-display text-2xl font-semibold ${
              fits ? "text-cyan-bright" : "text-amber-200"
            }`}
          >
            {formatMinutes(minutesPerRound)}
          </span>{" "}
          (incluye cambio de cancha).
        </p>
        {!fits && (
          <p className="mt-2 text-xs text-amber-200">
            ⚠ Quedan menos de 8 min por partido. Considerá sumar tiempo o reducir parejas.
          </p>
        )}
      </div>
    );
  }

  // by-set
  const minutesPerMatch = estimateMatchMinutes(config.matchFormat);
  const estimatedTotal = totalRounds * minutesPerMatch;
  const fits = estimatedTotal <= config.totalReservedMinutes;
  const diff = estimatedTotal - config.totalReservedMinutes;
  return (
    <div
      className={`mt-5 rounded-lg border p-4 text-sm ${
        fits
          ? "border-cyan-bright/30 bg-cyan-bright/[0.05]"
          : "border-amber-300/30 bg-amber-300/[0.05]"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-bright mb-2">Estimación</p>
      <p>
        <span className="font-semibold">{teamsCount} parejas</span> · {formatLabel}
      </p>
      <p className="mt-1 text-muted">
        {totalMatches} partidos · {totalRounds} rondas · {config.courts} cancha
        {config.courts === 1 ? "" : "s"}
      </p>
      <p className="mt-3">
        Estimación total{" "}
        <span
          className={`text-display text-2xl font-semibold ${
            fits ? "text-cyan-bright" : "text-amber-200"
          }`}
        >
          {formatMinutes(estimatedTotal)}
        </span>{" "}
        (vs {formatMinutes(config.totalReservedMinutes)} reservados).
      </p>
      {!fits && (
        <p className="mt-2 text-xs text-amber-200">
          ⚠ Excede el tiempo reservado por {formatMinutes(diff)}. Sumá tiempo, achicá formato o reducí parejas.
        </p>
      )}
    </div>
  );
}

function GroupCountCompare({
  config,
  options,
}: {
  config: TournamentConfig;
  options: Array<{
    value: PreferredGroupCount;
    label: string;
    plan: ReturnType<typeof calculatePlan>;
  }>;
}) {
  const matchMinutes =
    config.durationMode === "by-set" ? estimateMatchMinutes(config.matchFormat) : null;

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">
        Comparativa por cantidad de grupos
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-muted">
              <th className="pb-2 pr-3">Opción</th>
              <th className="pb-2 pr-3">Tamaños</th>
              <th className="pb-2 pr-3">Partidos</th>
              <th className="pb-2 pr-3">Rondas</th>
              <th className="pb-2 pr-3">
                {config.durationMode === "by-time" ? "Min/partido" : "Duración estimada"}
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => {
              const minutesPerRound =
                config.durationMode === "by-time"
                  ? config.totalReservedMinutes / opt.plan.totalRounds
                  : null;
              const estimatedTotal =
                matchMinutes !== null ? opt.plan.totalRounds * matchMinutes : null;
              const fits =
                config.durationMode === "by-time"
                  ? (minutesPerRound ?? 0) >= 8
                  : (estimatedTotal ?? 0) <= config.totalReservedMinutes;
              const isSelected = config.preferredGroupCount === opt.value;

              return (
                <tr
                  key={String(opt.value)}
                  className={`border-t border-white/5 ${
                    isSelected ? "text-cyan-bright" : "text-foreground/85"
                  }`}
                >
                  <td className="py-2 pr-3 font-medium">
                    {isSelected && "▸ "}
                    {opt.label}
                  </td>
                  <td className="py-2 pr-3 text-muted">{opt.plan.sizes.join(", ")}</td>
                  <td className="py-2 pr-3 text-muted">{opt.plan.totalMatches}</td>
                  <td className="py-2 pr-3 text-muted">{opt.plan.totalRounds}</td>
                  <td className={`py-2 pr-3 ${fits ? "" : "text-amber-200"}`}>
                    {minutesPerRound !== null
                      ? formatMinutes(minutesPerRound)
                      : estimatedTotal !== null
                        ? formatMinutes(estimatedTotal)
                        : "—"}
                    {!fits && " ⚠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.15em] text-muted">
      {label}
      <div className="normal-case tracking-normal">{children}</div>
    </label>
  );
}
