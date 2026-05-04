"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTournament } from "@/lib/client";
import { Button, Card } from "@/components/ui";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Player, Team } from "@/lib/types";

const REVEAL_DELAY_MS = 2200;

export function SorteoShow({ presentation = false }: { presentation?: boolean }) {
  const { tournament, loading } = useTournament(5000);
  void presentation;
  const [autoTriggerKey, setAutoTriggerKey] = useState(0);
  const lastTeamCount = useRef(0);

  // Si las parejas aparecen de la nada (admin acaba de sortear), auto-arrancamos el reveal
  useEffect(() => {
    if (lastTeamCount.current === 0 && tournament.teams.length > 0) {
      setAutoTriggerKey((k) => k + 1);
    }
    lastTeamCount.current = tournament.teams.length;
  }, [tournament.teams.length]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-muted">Cargando…</p>
      </main>
    );
  }

  const hasPairs = tournament.teams.length > 0;
  const hasGroups = tournament.groups.length > 0;

  if (!hasPairs) {
    return <WaitingScreen />;
  }

  return (
    <RevealScreen
      key={autoTriggerKey}
      teams={tournament.teams}
      players={tournament.players}
      groups={hasGroups ? tournament.groups : undefined}
      autoStart={autoTriggerKey > 0}
    />
  );
}

function WaitingScreen() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-cyan-bright hairline"
      >
        <span className="size-1.5 rounded-full bg-cyan-bright glow-cyan animate-pulse" />
        Esperando sorteo
      </motion.div>
      <h1 className="text-display text-5xl sm:text-7xl font-bold leading-[0.95] glow-text">
        Pronto se revelan las parejas
      </h1>
      <p className="mt-6 max-w-lg text-muted">
        El sorteo se dispara desde el panel de admin. Mantén esta pantalla abierta y proyectada.
      </p>
      <BolilleroIdle />
    </main>
  );
}

function BolilleroIdle() {
  return (
    <div className="relative mt-16 size-64">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-cyan-bright/30"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border border-cyan-bright/20"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-10 rounded-full border border-cyan-bright/10"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="size-3 rounded-full bg-cyan-bright glow-cyan" />
      </div>
    </div>
  );
}

interface RevealProps {
  teams: Team[];
  players: Player[];
  groups?: { id: string; teamIds: string[] }[];
  autoStart?: boolean;
}

function RevealScreen({ teams, players, groups, autoStart = false }: RevealProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [autoplay, setAutoplay] = useState(autoStart);

  // Una vez que se completa el reveal, queda mostrada la lista entera
  useEffect(() => {
    if (!autoplay) return;
    if (revealedCount >= teams.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), REVEAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoplay, revealedCount, teams.length]);

  const playerById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  );

  const groupOfTeam = useMemo(() => {
    if (!groups) return {};
    const map: Record<string, string> = {};
    groups.forEach((g) => g.teamIds.forEach((id) => (map[id] = g.id)));
    return map;
  }, [groups]);

  const allRevealed = revealedCount >= teams.length;

  if (revealedCount === 0 && !autoplay) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-bright">
          Sirius Padel Tournament
        </p>
        <h1 className="text-display text-5xl sm:text-7xl font-bold glow-text">
          {teams.length} parejas listas
        </h1>
        <p className="mt-4 max-w-md text-muted">
          Apretá iniciar y proyectá la pantalla. Las parejas se revelan una por una.
        </p>
        <div className="mt-10 flex gap-3">
          <Button onClick={() => setAutoplay(true)}>Iniciar reveal</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRevealedCount(teams.length);
              setAutoplay(false);
            }}
          >
            Ver todas
          </Button>
        </div>
        <BolilleroIdle />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-bright">
        Sorteo de parejas
      </p>
      <h1 className="text-display text-3xl sm:text-5xl font-bold glow-text">
        Sirius Padel Tournament
      </h1>

      <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {teams.map((team, idx) => {
          const isRevealed = idx < revealedCount;
          const isJustRevealed = idx === revealedCount - 1;
          return (
            <RevealCard
              key={team.id}
              index={idx}
              isRevealed={isRevealed}
              isJustRevealed={isJustRevealed}
              team={team}
              playerById={playerById}
              groupId={groupOfTeam[team.id]}
            />
          );
        })}
      </div>

      <div className="mt-10 flex gap-3">
        {!allRevealed && autoplay && (
          <Button variant="ghost" onClick={() => setRevealedCount(teams.length)}>
            Saltar
          </Button>
        )}
        {allRevealed && (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRevealedCount(0);
                setAutoplay(false);
              }}
            >
              Volver a empezar
            </Button>
            <Button
              onClick={() => {
                setRevealedCount(0);
                setAutoplay(true);
              }}
            >
              Reproducir de nuevo
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

interface RevealCardProps {
  index: number;
  isRevealed: boolean;
  isJustRevealed: boolean;
  team: Team;
  playerById: Record<string, Player>;
  groupId?: string;
}

function RevealCard({
  index,
  isRevealed,
  isJustRevealed,
  team,
  playerById,
  groupId,
}: RevealCardProps) {
  const a = playerById[team.playerIds[0]];
  const b = playerById[team.playerIds[1]];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="relative overflow-hidden">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Pareja {index + 1}</div>
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex h-20 items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="size-10 rounded-full border-2 border-cyan-bright/40 border-t-cyan-bright"
              />
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-3 text-lg font-semibold">
                <PlayerAvatar player={a} size="md" />
                <span className="truncate">{a?.name ?? "?"}</span>
              </div>
              <div className="flex items-center gap-3 text-lg font-semibold">
                <PlayerAvatar player={b} size="md" />
                <span className="truncate">{b?.name ?? "?"}</span>
              </div>
              {groupId && (
                <div className="mt-2 inline-flex w-fit rounded-full bg-cyan-bright/15 px-2.5 py-0.5 text-xs font-medium text-cyan-bright">
                  Grupo {groupId}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {isJustRevealed && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            initial={{ boxShadow: "0 0 0px rgba(61,219,217,0.0)" }}
            animate={{
              boxShadow: [
                "0 0 0px rgba(61,219,217,0.0)",
                "0 0 60px rgba(61,219,217,0.6)",
                "0 0 0px rgba(61,219,217,0.0)",
              ],
            }}
            transition={{ duration: 1.2 }}
          />
        )}
      </Card>
    </motion.div>
  );
}
