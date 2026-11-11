import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const key = process.env.RUNWAYML_API_SECRET;
    if (!key) return NextResponse.json({ error: "مفتاح خدمة الفيديو غير مضبوط." }, { status: 503 });
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "رقم المهمة غير صالح." }, { status: 400 });
    }
    const response = await fetch("https://api.dev.runwayml.com/v1/tasks/" + id, {
      headers: { Authorization: "Bearer " + key, "X-Runway-Version": "2024-11-06" },
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ error: payload.error || payload.message || "تعذر جلب حالة المهمة." }, { status: response.status });
    const outputs = Array.isArray(payload.output) ? payload.output : Array.isArray(payload.outputs) ? payload.outputs : [];
    return NextResponse.json({ taskId: payload.id, status: payload.status, output: outputs[0] || null, outputs, failure: payload.failure || payload.failureCode || null, progress: payload.progress ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء متابعة الفيديو." }, { status: 500 });
  }
}
