import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    error: "متابعة مهام Runway المدفوعة معطلة في هذا الإصدار."
  }, { status: 410 });
}
