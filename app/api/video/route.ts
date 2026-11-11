import { NextResponse } from "next/server";
export const runtime = "nodejs";

// Deliberately disabled: this project defaults to free workflows and must never
// submit a paid Runway job unless the user explicitly re-enables it in a future release.
export async function POST() {
  return NextResponse.json({
    error: "تم إيقاف Runway افتراضيًا احترامًا لاختيارك. استخدم مسار الخدمات المجانية أو خادم Wan 2.2 الخاص بك."
  }, { status: 410 });
}
