import { NextResponse } from "next/server";
import { getAllPackages } from "@/db/queries";
import { todayRiyadh } from "@/lib/dates";
import { hasValidSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** نسخة احتياطية كاملة بصيغة JSON (محمية بالمصادقة). */
export async function GET() {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const packages = await getAllPackages();
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, packages }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="raqi-backup-${todayRiyadh()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
