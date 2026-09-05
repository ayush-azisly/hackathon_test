import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { ActivityType } from "./factors";

export interface Activity {
  id: string;
  type: ActivityType;
  quantity: number;
  co2Kg: number;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
}

interface DB {
  activities: Activity[];
  weeklyTargetKg: number | null;
}

const EMPTY_DB: DB = { activities: [], weeklyTargetKg: null };
const REDIS_KEY = "planetpulse:db";

// Upstash Redis in production (Vercel injects the env vars);
// JSON file under data/ for local dev.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

async function load(): Promise<DB> {
  if (redis) {
    const db = await redis.get<DB>(REDIS_KEY);
    return db && Array.isArray(db.activities) ? db : { ...EMPTY_DB };
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DB;
    if (!Array.isArray(db.activities)) throw new Error("corrupt db");
    return db;
  } catch {
    return { ...EMPTY_DB };
  }
}

async function save(db: DB): Promise<void> {
  if (redis) {
    await redis.set(REDIS_KEY, db);
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

export async function getActivities(filter?: {
  type?: ActivityType;
  from?: string;
  to?: string;
}): Promise<Activity[]> {
  let list = (await load()).activities;
  if (filter?.type) list = list.filter((a) => a.type === filter.type);
  if (filter?.from) list = list.filter((a) => a.date >= filter.from!);
  if (filter?.to) list = list.filter((a) => a.date <= filter.to!);
  return list.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

export async function addActivity(a: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
  const db = await load();
  const activity: Activity = {
    ...a,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.activities.push(activity);
  await save(db);
  return activity;
}

export async function deleteActivity(id: string): Promise<boolean> {
  const db = await load();
  const before = db.activities.length;
  db.activities = db.activities.filter((a) => a.id !== id);
  if (db.activities.length === before) return false;
  await save(db);
  return true;
}

export async function getTarget(): Promise<number | null> {
  return (await load()).weeklyTargetKg;
}

export async function setTarget(kg: number | null): Promise<void> {
  const db = await load();
  db.weeklyTargetKg = kg;
  await save(db);
}
