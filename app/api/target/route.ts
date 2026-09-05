import { NextRequest, NextResponse } from "next/server";
import { getTarget, setTarget } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ weeklyTargetKg: await getTarget() });
}

export async function PUT(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.weeklyTargetKg === null) {
    await setTarget(null);
    return NextResponse.json({ weeklyTargetKg: null });
  }

  const kg = Number(body.weeklyTargetKg);
  if (!Number.isFinite(kg) || kg <= 0) {
    return NextResponse.json({ error: "weeklyTargetKg must be a positive number (or null to clear)" }, { status: 400 });
  }
  await setTarget(kg);
  return NextResponse.json({ weeklyTargetKg: kg });
}
