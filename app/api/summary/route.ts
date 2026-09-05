import { NextResponse } from "next/server";
import { ACTIVITY_TYPES } from "@/lib/factors";
import { getActivities, getTarget } from "@/lib/store";
import { toDateString, weekEnd, weekStart } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await getActivities();
  const total = round(all.reduce((s, a) => s + a.co2Kg, 0));

  const byCategory: Record<string, number> = {};
  for (const t of ACTIVITY_TYPES) byCategory[t] = 0;
  for (const a of all) byCategory[a.type] = round(byCategory[a.type] + a.co2Kg);

  // DP3 — the week is ISO 8601: Monday 00:00 through Sunday, server-local time.
  const now = new Date();
  const start = toDateString(weekStart(now));
  const end = toDateString(weekEnd(now));
  const weekActivities = all.filter((a) => a.date >= start && a.date <= end);
  const weekTotal = round(weekActivities.reduce((s, a) => s + a.co2Kg, 0));

  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const daysElapsed = dayOfWeek + 1;
  const projectedWeekTotal = round((weekTotal / daysElapsed) * 7);

  const target = await getTarget();
  return NextResponse.json({
    total,
    byCategory,
    week: {
      start,
      end,
      daysElapsed,
      totalKg: weekTotal,
      projectedTotalKg: projectedWeekTotal,
      targetKg: target,
      targetExceeded: target !== null ? weekTotal > target : false,
      onTrack: target !== null ? projectedWeekTotal <= target : null,
    },
  });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
