import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { EMPTY_TOURNAMENT, type Tournament } from "./types";

const KV_KEY = "sirius-padel:tournament";
const LOCAL_FILE = path.join(process.cwd(), ".tournament-state.json");

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
    return data ?? EMPTY_TOURNAMENT;
  }
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(raw) as Tournament;
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
  await fs.writeFile(LOCAL_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function mutate(
  fn: (t: Tournament) => Tournament | Promise<Tournament>,
): Promise<Tournament> {
  const current = await readTournament();
  const next = await fn(current);
  await writeTournament(next);
  return next;
}
