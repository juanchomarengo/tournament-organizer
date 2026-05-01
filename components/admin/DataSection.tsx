"use client";

import { useRef, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { downloadJson, downloadXlsx, readJsonFile } from "@/lib/export";
import { saveTournament } from "@/lib/client";
import type { Tournament } from "@/lib/types";

interface Props {
  tournament: Tournament;
  refresh: () => Promise<void>;
}

export function DataSection({ tournament, refresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  function exportXlsx() {
    setError(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadXlsx(tournament, `sirius-padel-${date}.xlsx`);
      setMsg("Excel descargado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "error exportando");
    }
  }

  function exportJson() {
    setError(null);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(tournament, `sirius-padel-${ts}.json`);
      setMsg("JSON descargado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "error exportando");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !confirm(
        "Importar este JSON va a reemplazar TODO el estado actual. ¿Continuar?",
      )
    ) {
      e.target.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const next = await readJsonFile(file);
      await saveTournament(next);
      await refresh();
      setMsg("Estado restaurado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "error importando");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function confirmReset() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await saveTournament({
        players: [],
        teams: [],
        groups: [],
        matches: [],
        state: "setup",
        champion: null,
        updatedAt: 0,
      });
      await refresh();
      setMsg("Torneo reseteado");
      setResetOpen(false);
      setResetText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "error reseteando");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-display text-xl font-semibold">Backup y export</h2>
      <p className="mt-1 text-sm text-muted">
        Antes de cada fase importante, descargá un snapshot. Si algo sale mal, el Excel sirve para
        seguir el torneo a mano.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={exportXlsx} disabled={busy}>
          Exportar Excel
        </Button>
        <Button variant="ghost" onClick={exportJson} disabled={busy}>
          Exportar JSON
        </Button>
        <Button
          variant="ghost"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          Importar JSON
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFile}
        />
        <Button variant="danger" onClick={() => setResetOpen(true)} disabled={busy}>
          Reset total
        </Button>
      </div>

      {msg && <p className="mt-3 text-sm text-cyan-bright">{msg}</p>}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {resetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-6"
          onClick={() => {
            setResetOpen(false);
            setResetText("");
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-rose-400/30 bg-navy-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => {
                setResetOpen(false);
                setResetText("");
              }}
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
            <h3 className="text-display text-xl font-semibold text-rose-200 pr-8">Reset total</h3>
            <p className="mt-2 text-sm text-muted">
              Esto borra <span className="text-foreground">jugadores, parejas, grupos, partidos y campeón</span>.
              No se puede deshacer salvo importando un JSON previo.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-rose-300">
              Para confirmar, escribí <span className="font-mono">RESET</span>
            </p>
            <Input
              autoFocus
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              className="mt-2 font-mono"
              placeholder="RESET"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setResetOpen(false);
                  setResetText("");
                }}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmReset}
                disabled={busy || resetText !== "RESET"}
              >
                {busy ? "Reseteando…" : "Reset total"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
