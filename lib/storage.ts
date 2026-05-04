import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { DEFAULT_CONFIG, EMPTY_TOURNAMENT, type Tournament } from "./types";

const KV_KEY = "sirius-padel:tournament";
const LOCAL_FILE = path.join(process.cwd(), ".tournament-state.json");

function withDefaults(t: Tournament | null | undefined): Tournament {
  if (!t) return EMPTY_TOURNAMENT;
  return {
    ...t,
    config: { ...DEFAULT_CONFIG, ...(t.config ?? {}) },
  };
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export async function readTournament(): Promise<Tournament> {
  const r = getRedis();
  if (r) {
    const data = await r.get<Tournament>(KV_KEY);
    return withDefaults(data);
  }
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return withDefaults(JSON.parse(raw) as Tournament);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return EMPTY_TOURNAMENT;
    }
    throw err;
  }
}

export async function writeTournament(t: Tournament): Promise<void> {
  const next: Tournament = { ...t, updatedAt: Date.now() };
  const r = getRedis();
  if (r) {
    await r.set(KV_KEY, next);
    return;
  }
  // Escritura atómica: tmp file + rename, para evitar race con readers concurrentes
  const tmp = `${LOCAL_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf-8");
  await fs.rename(tmp, LOCAL_FILE);
}

export async function readTournamentSafe(): Promise<Tournament> {
  // Wrapper que tolera un archivo "vacío" durante una transición
  try {
    return await readTournament();
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Archivo medio-escrito, esperar y reintentar una vez
      await new Promise((r) => setTimeout(r, 20));
      return readTournament();
    }
    throw err;
  }
}

export async function mutate(
  fn: (t: Tournament) => Tournament | Promise<Tournament>,
): Promise<Tournament> {
  const current = await readTournament();
  const next = await fn(current);
  await writeTournament(next);
  return next;
}
