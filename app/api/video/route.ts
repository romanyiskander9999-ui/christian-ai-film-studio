import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const key = process.env.RUNWAYML_API_SECRET;
    if (!key) return NextResponse.json({ error: "إنتاج الفيديو غير مفعّل بعد. أضف RUNWAYML_API_SECRET إلى متغيرات البيئة في Vercel." }, { status: 503 });
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const duration = Number(body?.duration ?? 5);
    const ratio = body?.ratio === "720:1280" ? "720:1280" : "1280:720";
    const model = process.env.RUNWAY_VIDEO_MODEL || "gen4.5";
    if (prompt.length < 20 || prompt.length > 950) return NextResponse.json({ error: "وصف الفيديو يجب أن يكون بين 20 و950 حرفًا." }, { status: 400 });
    if (![5, 10].includes(duration)) return NextResponse.json({ error: "المدة المتاحة حاليًا 5 أو 10 ثوانٍ لكل لقطة." }, { status: 400 });

    const response = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", "X-Runway-Version": "2024-11-06" },
      body: JSON.stringify({ model, promptText: prompt, ratio, duration })
    });
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ error: payload.error || payload.message || "رفض مزود الفيديو الطلب.", details: payload }, { status: response.status });
    if (!payload.id) throw new Error("لم يُرجع مزود الفيديو رقم المهمة.");
    return NextResponse.json({ taskId: payload.id, status: "PENDING", estimatedCost: payload.estimatedCost || null, model });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر بدء توليد الفيديو." }, { status: 500 });
  }
}
