"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const TYPES = {
  car: { label: "Car travel", unit: "km", factor: 0.2 },
  bus: { label: "Bus travel", unit: "km", factor: 0.08 },
  flight: { label: "Flight", unit: "km", factor: 0.25 },
  electricity: { label: "Electricity", unit: "kWh", factor: 0.8 },
  veg_meal: { label: "Veg meal", unit: "meals", factor: 0.5 },
  non_veg_meal: { label: "Non-veg meal", unit: "meals", factor: 2.0 },
} as const;

type ActivityType = keyof typeof TYPES;

interface Activity {
  id: string;
  type: ActivityType;
  quantity: number;
  co2Kg: number;
  date: string;
}

interface Summary {
  total: number;
  byCategory: Record<ActivityType, number>;
  week: {
    start: string;
    end: string;
    daysElapsed: number;
    totalKg: number;
    projectedTotalKg: number;
    targetKg: number | null;
    targetExceeded: boolean;
    onTrack: boolean | null;
  };
}

const CATEGORY_COLORS: Record<ActivityType, string> = {
  car: "bg-rose-500",
  bus: "bg-amber-500",
  flight: "bg-violet-500",
  electricity: "bg-sky-500",
  veg_meal: "bg-emerald-500",
  non_veg_meal: "bg-orange-600",
};

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // log form
  const [type, setType] = useState<ActivityType>("car");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayString());
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // target form
  const [targetInput, setTargetInput] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);

  // history filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/summary");
    setSummary(await res.json());
  }, []);

  const loadActivities = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const res = await fetch(`/api/activities?${params}`);
    const data = await res.json();
    setActivities(data.activities ?? []);
  }, [filterType, filterFrom, filterTo]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const refresh = useCallback(() => {
    loadSummary();
    loadActivities();
  }, [loadSummary, loadActivities]);

  async function submitActivity(confirmAbsurd: boolean) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, quantity: Number(quantity), date, confirmAbsurd }),
      });
      const data = await res.json();
      if (res.status === 422 && data.code === "NEEDS_CONFIRMATION") {
        setConfirmMsg(data.error);
        return;
      }
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong");
        return;
      }
      setQuantity("");
      setConfirmMsg(null);
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function saveTarget() {
    setTargetError(null);
    const res = await fetch("/api/target", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyTargetKg: Number(targetInput) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setTargetError(data.error ?? "Something went wrong");
      return;
    }
    setTargetInput("");
    refresh();
  }

  async function removeActivity(id: string) {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    refresh();
  }

  const previewCo2 = useMemo(() => {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) return null;
    return Math.round(TYPES[type].factor * q * 1000) / 1000;
  }, [type, quantity]);

  const week = summary?.week;
  const target = week?.targetKg ?? null;
  const weekPct = target ? Math.min(100, (week!.totalKg / target) * 100) : 0;
  const maxCategory = summary
    ? (Object.entries(summary.byCategory) as [ActivityType, number][]).reduce(
        (best, cur) => (cur[1] > best[1] ? cur : best),
        ["car", 0] as [ActivityType, number]
      )
    : null;
  const maxCategoryVal = summary
    ? Math.max(...Object.values(summary.byCategory), 0.001)
    : 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-800">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-700">
          🌍 PlanetPulse
        </h1>
        <p className="text-slate-500">
          Turn daily choices into a visible carbon footprint.
        </p>
      </header>

      {/* DP1 — the nudge: warn honestly, encourage concretely, never block */}
      {week?.targetExceeded && (
        <div
          data-testid="nudge-banner"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4"
        >
          <p className="font-semibold text-amber-800">
            ⚠️ You’ve passed your weekly target of {target} kg CO₂ — you’re at{" "}
            {week.totalKg} kg.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            That’s okay — awareness is the first step. Your biggest source is{" "}
            <strong>{maxCategory ? TYPES[maxCategory[0]].label.toLowerCase() : ""}</strong>.
            {maxCategory?.[0] === "car" && " Try swapping a car trip for the bus: it cuts that trip’s footprint by 60%."}
            {maxCategory?.[0] === "non_veg_meal" && " Swapping one non-veg meal for veg saves 1.5 kg CO₂."}
            {maxCategory?.[0] === "electricity" && " Small wins: run heavy appliances less, switch off standby loads."}
            {maxCategory?.[0] === "flight" && " Flights are big one-offs — the rest of your week still matters."}
            {(maxCategory?.[0] === "bus" || maxCategory?.[0] === "veg_meal") && " You’re already choosing low-carbon options — keep going."}
            {" "}You can keep logging: honest data beats a pretty streak.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Log an activity */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Log an activity</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitActivity(false);
            }}
            className="space-y-3"
          >
            <div className="flex gap-3">
              <label className="flex-1 text-sm">
                Type
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as ActivityType);
                    setConfirmMsg(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  data-testid="activity-type"
                >
                  {Object.entries(TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} ({v.factor} kg/{v.unit === "meals" ? "meal" : v.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 text-sm">
                Quantity ({TYPES[type].unit})
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setConfirmMsg(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                  data-testid="activity-quantity"
                  placeholder="e.g. 10"
                />
              </label>
            </div>
            <label className="block text-sm">
              Date
              <input
                type="date"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                data-testid="activity-date"
              />
            </label>
            {previewCo2 !== null && !confirmMsg && (
              <p className="text-sm text-slate-500">
                = <strong>{previewCo2} kg CO₂</strong>
              </p>
            )}
            {formError && (
              <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700" data-testid="form-error">
                {formError}
              </p>
            )}
            {/* DP2 — absurd input: pause and ask, don't silently accept or hard-reject */}
            {confirmMsg ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" data-testid="absurd-confirm">
                <p className="text-amber-800">{confirmMsg}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitActivity(true)}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
                  >
                    Yes, it’s correct — log it
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmMsg(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                  >
                    Let me fix it
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                data-testid="log-activity"
              >
                {submitting ? "Logging…" : "Log activity"}
              </button>
            )}
          </form>
        </section>

        {/* Weekly target */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">Weekly target</h2>
          {week && (
            <p className="mb-3 text-xs text-slate-400">
              Week of {week.start} → {week.end} (starts Monday)
            </p>
          )}
          {target !== null && week ? (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span data-testid="week-progress-label">
                    {week.totalKg} / {target} kg CO₂
                  </span>
                  <span className={week.targetExceeded ? "font-semibold text-rose-600" : "text-slate-500"}>
                    {Math.round((week.totalKg / target) * 100)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${week.targetExceeded ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${weekPct}%` }}
                  />
                </div>
              </div>
              {/* DP3 — mid-week pace, so "under target on Tuesday" isn't false comfort */}
              <p className="text-sm text-slate-600" data-testid="pace-indicator">
                Day {week.daysElapsed} of 7 · At this pace you’ll end the week at{" "}
                <strong>{week.projectedTotalKg} kg</strong>{" "}
                {week.onTrack === null ? "" : week.onTrack ? (
                  <span className="text-emerald-600">— on track ✅</span>
                ) : (
                  <span className="text-rose-600">— over target 📈</span>
                )}
              </p>
            </div>
          ) : (
            <p className="mb-3 text-sm text-slate-500">
              No target set yet. Pick a weekly CO₂ budget — the average is
              roughly 100–200 kg/week per person.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={target !== null ? `Current: ${target} kg` : "e.g. 50"}
              className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
              data-testid="target-input"
            />
            <button
              onClick={saveTarget}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              data-testid="save-target"
            >
              {target !== null ? "Update target" : "Set target"}
            </button>
          </div>
          {targetError && <p className="mt-2 text-sm text-rose-700">{targetError}</p>}
        </section>
      </div>

      {/* Dashboard */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Dashboard</h2>
        <p className="mb-4 text-3xl font-bold" data-testid="total-footprint">
          {summary?.total ?? 0} <span className="text-base font-normal text-slate-500">kg CO₂ total</span>
        </p>
        <div className="space-y-2">
          {summary &&
            (Object.entries(summary.byCategory) as [ActivityType, number][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-slate-600">{TYPES[k].label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className={`h-full rounded ${CATEGORY_COLORS[k]}`}
                    style={{ width: `${(v / maxCategoryVal) * 100}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-medium" data-testid={`category-${k}`}>
                  {v} kg
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* History & filter */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">History</h2>
        <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
          <label>
            Type
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 p-2"
              data-testid="filter-type"
            >
              <option value="">All types</option>
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 p-2"
              data-testid="filter-from"
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 p-2"
              data-testid="filter-to"
            />
          </label>
          {(filterType || filterFrom || filterTo) && (
            <button
              onClick={() => {
                setFilterType("");
                setFilterFrom("");
                setFilterTo("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-slate-500" data-testid="history-empty">
            No activities logged{filterType || filterFrom || filterTo ? " for these filters" : " yet"}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="history-table">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Activity</th>
                  <th className="py-2 pr-4">Quantity</th>
                  <th className="py-2 pr-4">CO₂</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{a.date}</td>
                    <td className="py-2 pr-4">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[a.type]}`} />
                      {TYPES[a.type].label}
                    </td>
                    <td className="py-2 pr-4">{a.quantity} {TYPES[a.type].unit}</td>
                    <td className="py-2 pr-4 font-medium">{a.co2Kg} kg</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => removeActivity(a.id)}
                        className="text-slate-400 hover:text-rose-600"
                        aria-label="Delete activity"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-slate-400">
        PlanetPulse · weeks start Monday (ISO 8601) · emission factors are fixed
        per the brief
      </footer>
    </main>
  );
}
