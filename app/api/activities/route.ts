import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_TYPES, FACTORS, co2For, isActivityType } from "@/lib/factors";
import { addActivity, getActivities } from "@/lib/store";
import { isValidDateString, toDateString } from "@/lib/week";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const type = params.get("type") ?? undefined;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  if (type && !isActivityType(type)) {
    return NextResponse.json(
      { error: `Unknown type "${type}". Valid types: ${ACTIVITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  for (const [name, v] of [["from", from], ["to", to]] as const) {
    if (v && !isValidDateString(v)) {
      return NextResponse.json({ error: `Invalid ${name} date, expected YYYY-MM-DD` }, { status: 400 });
    }
  }

  const activities = await getActivities({ type: type as never, from, to });
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = String(body.type ?? "");
  if (!isActivityType(type)) {
    return NextResponse.json(
      { error: `Unknown type "${type}". Valid types: ${ACTIVITY_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive number" }, { status: 400 });
  }

  const date = body.date ? String(body.date) : toDateString(new Date());
  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const info = FACTORS[type];

  // DP2 — absurd input policy:
  // beyond hardMax is physically impossible for a day and is rejected;
  // beyond sanityMax is suspicious and requires an explicit confirmAbsurd flag.
  if (quantity > info.hardMax) {
    return NextResponse.json(
      {
        error: `${quantity} ${info.unit} of ${info.label.toLowerCase()} in one entry is not physically plausible (max accepted: ${info.hardMax} ${info.unit}).`,
        code: "IMPOSSIBLE_QUANTITY",
      },
      { status: 422 }
    );
  }
  if (quantity > info.sanityMax && body.confirmAbsurd !== true) {
    return NextResponse.json(
      {
        error: `${quantity} ${info.unit} looks unusually high for ${info.label.toLowerCase()} (typical max ~${info.sanityMax} ${info.unit}). Re-submit with "confirmAbsurd": true if it is correct.`,
        code: "NEEDS_CONFIRMATION",
        sanityMax: info.sanityMax,
      },
      { status: 422 }
    );
  }

  const activity = await addActivity({ type, quantity, co2Kg: co2For(type, quantity), date });
  return NextResponse.json({ activity }, { status: 201 });
}
