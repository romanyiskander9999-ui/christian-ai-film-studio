import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE = "https://mastap-wan22-remix-sfw-t2v.hf.space";

function findVideo(value: unknown): string | null {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return value;
    if (/^(\/|gradio_api\/)/i.test(value)) return new URL(value, SPACE).toString();
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideo(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    for (const key of ["url", "video", "path"]) {
      const found = findVideo(item[key]);
      if (found) return found;
    }
    for (const nested of Object.values(item)) {
      const found = findVideo(nested);
      if (found) return found;
    }
  }
  return null;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await context.params;
    if (!taskId || taskId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      return NextResponse.json({ error: "معرّف مهمة الفيديو غير صالح." }, { status: 400 });
    }
    const response = await fetch(`${SPACE}/gradio_api/call/generate_video/${encodeURIComponent(taskId)}`, {
      headers: { Accept: "text/event-stream" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    if (!response.ok) {
      return NextResponse.json({ error: "تعذر قراءة حالة مهمة Hugging Face: " + response.status }, { status: 502 });
    }

    const payloads: unknown[] = [];
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try { payloads.push(JSON.parse(raw)); } catch { payloads.push(raw); }
    }
    const errorValue = payloads.find(value => value && typeof value === "object" && !Array.isArray(value) && ("error" in value || "message" in value));
    if (errorValue) {
      const detail = errorValue as Record<string, unknown>;
      if (detail.error || detail.message) {
        return NextResponse.json({ status: "FAILED", error: String(detail.error || detail.message) });
      }
    }
    for (const payload of payloads) {
      const videoUrl = findVideo(payload);
      if (videoUrl) return NextResponse.json({ status: "COMPLETED", videoUrl });
    }
    const lower = body.toLowerCase();
    if (lower.includes("error") || lower.includes("failed")) {
      return NextResponse.json({ status: "FAILED", error: "أبلغ محرك الفيديو عن فشل المهمة. أعد المحاولة أو استخدم الواجهة اليدوية." });
    }
    return NextResponse.json({ status: "IN_PROGRESS", message: "ما زال محرك الفيديو يعالج المهمة." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر متابعة مهمة الفيديو.";
    return NextResponse.json({ status: "IN_PROGRESS", error: message });
  }
}
