import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE = "https://mastap-wan22-remix-sfw-t2v.hf.space";

function findVideo(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) && /\.(mp4|webm|mov)(\?|$)/i.test(value)) return value;
    return "";
  }
  if (Array.isArray(value)) {
    for (const item of value) { const found = findVideo(item); if (found) return found; }
    return "";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && /^https?:\/\//i.test(obj.url)) return obj.url;
    for (const item of Object.values(obj)) { const found = findVideo(item); if (found) return found; }
  }
  return "";
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{6,120}$/.test(id)) {
      return NextResponse.json({ error: "رقم المهمة غير صالح." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let response: Response;
    try {
      response = await fetch(`${SPACE}/gradio_api/call/generate_video/${encodeURIComponent(id)}`, {
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: detail || "تعذر قراءة حالة المهمة من Hugging Face." }, { status: response.status });
    }

    const streamText = await response.text();
    const dataLines = streamText.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim());
    for (const line of dataLines.reverse()) {
      if (!line || line === "[DONE]") continue;
      try {
        const payload = JSON.parse(line);
        if (payload?.error) return NextResponse.json({ taskId: id, status: "FAILED", error: String(payload.error) });
        const videoUrl = findVideo(payload);
        if (videoUrl) return NextResponse.json({ taskId: id, status: "COMPLETED", videoUrl });
        if (Array.isArray(payload) && payload.length) {
          return NextResponse.json({ taskId: id, status: "COMPLETED", result: payload, message: "اكتمل التوليد، لكن تعذر استخراج رابط الفيديو تلقائيًا. افتح المساحة لعرض النتيجة." });
        }
      } catch { /* Ignore status/heartbeat frames that are not JSON. */ }
    }
    return NextResponse.json({ taskId: id, status: "RUNNING", message: "ما زالت المهمة قيد الانتظار أو التوليد. حاول التحديث بعد قليل." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر تحديث حالة التوليد.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
