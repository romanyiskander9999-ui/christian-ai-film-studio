import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE = "https://mastap-wan22-remix-sfw-t2v.hf.space";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 10 || prompt.length > 5000) {
      return NextResponse.json({ error: "وصف المشهد يجب أن يكون بين 10 و5000 حرف." }, { status: 400 });
    }

    // Public Gradio Space: no paid API key is configured or used.
    const response = await fetch(`${SPACE}/gradio_api/call/generate_video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [prompt] }),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.event_id) {
      return NextResponse.json({
        error: data.detail || data.error || "تعذر إرسال المهمة إلى Hugging Face. قد تكون مساحة التوليد متوقفة مؤقتًا أو مزدحمة.",
        details: data
      }, { status: response.status || 502 });
    }
    return NextResponse.json({ taskId: data.event_id, status: "QUEUED", provider: "Hugging Face ZeroGPU / Wan 2.2" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر الاتصال بمحرك الفيديو السحابي." }, { status: 502 });
  }
}
