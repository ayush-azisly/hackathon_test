import fs from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function load(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(raw) as DB;
    if (!Array.isArray(db.activities)) throw new Error("corrupt db");
    return db;
  } catch {
    return { activities: [], weeklyTargetKg: null };
  }
}

function save(db: DB): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

export function getActivities(filter?: {
  type?: ActivityType;
  from?: string;
  to?: string;
}): Activity[] {
  let list = load().activities;
  if (filter?.type) list = list.filter((a) => a.type === filter.type);
  if (filter?.from) list = list.filter((a) => a.date >= filter.from!);
  if (filter?.to) list = list.filter((a) => a.date <= filter.to!);
  return list.sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)));
}

export function addActivity(a: Omit<Activity, "id" | "createdAt">): Activity {
  const db = load();
  const activity: Activity = {
    ...a,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.activities.push(activity);
  save(db);
  return activity;
}

export function deleteActivity(id: string): boolean {
  const db = load();
  const before = db.activities.length;
  db.activities = db.activities.filter((a) => a.id !== id);
  if (db.activities.length === before) return false;
  save(db);
  return true;
}

export function getTarget(): number | null {
  return load().weeklyTargetKg;
}

export function setTarget(kg: number | null): void {
  const db = load();
  db.weeklyTargetKg = kg;
  save(db);
}
