import { NextResponse } from "next/server";
import { deleteActivity } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = deleteActivity(params.id);
  if (!ok) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
