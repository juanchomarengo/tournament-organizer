"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTournament } from "@/lib/client";
import { Card, Badge } from "@/components/ui";
import { teamLabel, rankGroup } from "@/lib/draw";
import type { Match, Team, Player, Group } from "@/lib/types";

export function BracketView() {
  const { tournament, loading } = useTournament(5000);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-muted">Cargando…</p>
      </main>
    );
  }

  if (tournament.state === "setup" || tournament.state === "pairs_drawn") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-cyan-bright">Bracket</p>
        <h1 className="text-display text-4xl sm:text-6xl font-bold glow-text">
          Aparece cuando arranque el torneo
        </h1>
        <p className="mt-4 max-w-lg text-muted">
          Los grupos y el bracket se muestran acá una vez que se sorteen las parejas y los grupos.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      {tournament.state === "finished" && tournament.champion && (
        <ChampionHero
          championId={tournament.champion}
          teams={tournament.teams}
          players={tournament.players}
        />
      )}

      <Section title="Grupos" subtitle="Fase 1 · todos contra todos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tournament.groups.map((g, idx) => (
            <GroupCard
              key={g.id}
              group={g}
              court={idx + 1}
              teams={tournament.teams}
              players={tournament.players}
              matches={tournament.matches}
            />
          ))}
        </div>
      </Section>

      <Section title="Final Four" subtitle="Fase 2 · canchas 1 y 2">
        <FinalFour
          matches={tournament.matches}
          teams={tournament.teams}
          players={tournament.players}
        />
      </Section>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-display text-2xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function GroupCard({
  group,
  court,
  teams,
  players,
  matches,
}: {
  group: Group;
  court: number;
  teams: Team[];
  players: Player[];
  matches: Match[];
}) {
  const groupMatches = matches.filter((m) => m.phase === "groups" && m.groupId === group.id);
  const allDone = groupMatches.length === 3 && groupMatches.every((m) => m.status === "done");
  const ranking = useMemo(() => rankGroup(group, matches), [group, matches]);
  const winnerId = allDone ? ranking[0]?.teamId : null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-display text-lg font-semibold">Grupo {group.id}</span>
          <Badge color="muted">Cancha {court}</Badge>
        </div>
        {allDone && <Badge color="cyan">Cerrado</Badge>}
      </div>

      <ul className="flex flex-col gap-1.5">
        {ranking.map((row, i) => {
          const team = teams.find((t) => t.id === row.teamId);
          const isWinner = winnerId === row.teamId;
          return (
            <li
              key={row.teamId}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                isWinner ? "bg-cyan-bright/15 text-cyan-bright" : "bg-white/[0.02] text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted w-4 text-center">{i + 1}</span>
                <span className="truncate">{teamLabel(team, players)}</span>
              </div>
              <span className="text-xs text-muted shrink-0">
                {row.wins}V · {row.gamesFor}-{row.gamesAgainst}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-1.5 text-xs">
        {groupMatches
          .sort((a, b) => a.round - b.round)
          .map((m) => (
            <MiniMatch key={m.id} match={m} teams={teams} players={players} />
          ))}
      </div>
    </Card>
  );
}

function MiniMatch({
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
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-muted">
      <span className="truncate text-xs">
        {teamLabel(a, players)}
      </span>
      <span className="text-[10px] shrink-0">
        {done && match.score
          ? `${match.score.gamesA}-${match.score.gamesB}`
          : "vs"}
      </span>
      <span className="truncate text-xs text-right">
        {teamLabel(b, players)}
      </span>
    </div>
  );
}

function FinalFour({
  matches,
  teams,
  players,
}: {
  matches: Match[];
  teams: Team[];
  players: Player[];
}) {
  const semis = matches.filter((m) => m.phase === "semis").sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
  const final = matches.find((m) => m.phase === "final");
  const third = matches.find((m) => m.phase === "third");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Semifinales</p>
        {semis.map((m) => (
          <BracketMatch key={m.id} match={m} teams={teams} players={players} highlight />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Final</p>
        {final && <BracketMatch match={final} teams={teams} players={players} bigWinner />}
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">3er puesto</p>
        {third && <BracketMatch match={third} teams={teams} players={players} />}
      </div>
      <div className="flex items-center justify-center">
        <CupSilhouette />
      </div>
    </div>
  );
}

function BracketMatch({
  match,
  teams,
  players,
  highlight,
  bigWinner,
}: {
  match: Match;
  teams: Team[];
  players: Player[];
  highlight?: boolean;
  bigWinner?: boolean;
}) {
  const teamA = teams.find((t) => t.id === match.teamA);
  const teamB = teams.find((t) => t.id === match.teamB);
  const winnerA = match.winner !== null && match.winner === match.teamA;
  const winnerB = match.winner !== null && match.winner === match.teamB;
  return (
    <Card className={`${highlight ? "border border-cyan-bright/30" : ""}`}>
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted">
        {match.label} · Cancha {match.court}
      </p>
      <div className="flex flex-col gap-1.5">
        <BracketLine
          name={teamA ? teamLabel(teamA, players) : "Por definir"}
          score={match.score?.gamesA}
          winner={winnerA}
          bigWinner={bigWinner && winnerA}
        />
        <BracketLine
          name={teamB ? teamLabel(teamB, players) : "Por definir"}
          score={match.score?.gamesB}
          winner={winnerB}
          bigWinner={bigWinner && winnerB}
        />
      </div>
    </Card>
  );
}

function BracketLine({
  name,
  score,
  winner,
  bigWinner,
}: {
  name: string;
  score?: number;
  winner: boolean;
  bigWinner?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
        winner ? "bg-cyan-bright/15 text-cyan-bright" : "text-foreground"
      } ${bigWinner ? "glow-text" : ""}`}
    >
      <span className="truncate">{name}</span>
      <span className="text-xs shrink-0">{score ?? "—"}</span>
    </div>
  );
}

function CupSilhouette() {
  return (
    <motion.svg
      viewBox="0 0 200 240"
      className="size-40 text-cyan-bright/40"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cup-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5EFFD8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3DDBD9" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <path
        d="M60 30 H140 V90 Q140 140 100 150 Q60 140 60 90 Z"
        fill="url(#cup-grad)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M40 50 Q20 50 20 75 Q20 100 50 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M160 50 Q180 50 180 75 Q180 100 150 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="80" y="150" width="40" height="20" fill="currentColor" opacity="0.6" />
      <rect x="60" y="170" width="80" height="14" fill="currentColor" opacity="0.4" />
      <rect x="50" y="184" width="100" height="10" fill="currentColor" opacity="0.3" />
    </motion.svg>
  );
}

function ChampionHero({
  championId,
  teams,
  players,
}: {
  championId: string;
  teams: Team[];
  players: Player[];
}) {
  const team = teams.find((t) => t.id === championId);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="relative mb-12 overflow-hidden rounded-3xl border border-cyan-bright/40 p-12 text-center glow-cyan"
      style={{
        background:
          "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(94,255,216,0.25), transparent 70%), linear-gradient(180deg, rgba(61,219,217,0.08), rgba(15,31,56,0.6))",
      }}
    >
      <Confetti />
      <motion.p
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs uppercase tracking-[0.4em] text-cyan-bright"
      >
        ★ Campeones del Sirius Padel Tournament ★
      </motion.p>
      <motion.h2
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 18 }}
        className="text-display mt-3 text-6xl sm:text-7xl md:text-8xl font-bold text-cyan-bright glow-text"
      >
        {teamLabel(team, players)}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-sm uppercase tracking-[0.25em] text-foreground/80"
      >
        2026 World Cup Merch
      </motion.p>
    </motion.div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 60 });
  const colors = ["#3DDBD9", "#5EFFD8", "#FF5B8A", "#8B5CF6", "#FF7A45", "#B6F0E0"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const color = colors[i % colors.length];
        const left = (i * 47) % 100;
        const delay = (i * 0.13) % 4;
        const size = 6 + ((i * 7) % 8);
        return (
          <motion.div
            key={i}
            className="absolute -top-2 rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.4,
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
            initial={{ y: 0, rotate: 0, opacity: 0 }}
            animate={{
              y: [0, 320],
              x: [0, ((i % 5) - 2) * 20],
              rotate: [0, 360, 720],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 3.5,
              delay,
              repeat: Infinity,
              repeatDelay: 0.5,
              ease: "easeIn",
            }}
          />
        );
      })}
    </div>
  );
}
