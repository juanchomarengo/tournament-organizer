"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTournament } from "@/lib/client";
import { Card } from "@/components/ui";

const EVENT_TS = new Date("2026-05-06T18:30:00-03:00").getTime();

function diff(now: number) {
  const ms = Math.max(0, EVENT_TS - now);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return { days, hours, minutes, seconds, done: ms === 0 };
}

export function HomeView() {
  const { tournament } = useTournament(10000);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const hasMatchActivity = tournament.matches.some(
    (m) => m.status === "done" || m.status === "in_progress",
  );
  const finished = tournament.state === "finished";
  const live = !finished && hasMatchActivity;

  return (
    <main className="flex flex-1 flex-col items-center px-6 pt-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-cyan-bright hairline"
      >
        <span className={`size-1.5 rounded-full bg-cyan-bright ${live ? "animate-pulse glow-cyan" : ""}`} />
        {live ? "En vivo" : finished ? "Finalizado" : "Sirius Software"}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="text-display text-center text-5xl sm:text-7xl md:text-8xl font-bold leading-[0.95] glow-text"
      >
        SIRIUS PADEL
        <br />
        <span className="text-cyan-bright">TOURNAMENT</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 max-w-md text-center text-cyan-bright text-sm uppercase tracking-[0.2em]"
      >
        The winning team will take home 2026 World Cup merch
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-10 flex flex-col items-center gap-1 text-muted"
      >
        <p>Miércoles 6 de mayo · 18:30 hs</p>
        <p>Pilar Padel Center</p>
      </motion.div>

      {now !== null && !live && !finished && <Countdown now={now} />}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/sorteo"
          className="rounded-full bg-cyan-bright px-6 py-3 font-medium text-navy-950 transition hover:scale-105 glow-cyan"
        >
          Ver sorteo
        </Link>
        <Link
          href="/bracket"
          className="rounded-full px-6 py-3 font-medium text-foreground hairline hover:bg-white/5 transition"
        >
          Bracket
        </Link>
        <Link
          href="/cronograma"
          className="rounded-full px-6 py-3 font-medium text-foreground hairline hover:bg-white/5 transition"
        >
          Cronograma
        </Link>
      </motion.div>

      {tournament.players.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 w-full max-w-3xl"
        >
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-bright">
                Confirmados
              </p>
              <span className="text-xs text-muted">{tournament.players.length} jugadores</span>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              {tournament.players.map((p) => (
                <li key={p.id} className="flex items-center gap-2 truncate">
                  <span className="size-1.5 rounded-full shrink-0 bg-cyan-bright/60" />
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      )}
    </main>
  );
}

function Countdown({ now }: { now: number }) {
  const { days, hours, minutes, seconds } = diff(now);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-10 flex items-center gap-3"
    >
      <CountUnit value={days} label="días" />
      <Sep />
      <CountUnit value={hours} label="hs" />
      <Sep />
      <CountUnit value={minutes} label="min" />
      <Sep />
      <CountUnit value={seconds} label="seg" />
    </motion.div>
  );
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-display text-3xl sm:text-4xl font-bold tabular-nums glow-text">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted">{label}</span>
    </div>
  );
}

function Sep() {
  return <span className="text-cyan-bright/50 text-2xl">·</span>;
}
