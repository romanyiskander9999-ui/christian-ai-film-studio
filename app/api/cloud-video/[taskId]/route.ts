import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE = "https://mastap-wan22-remix-sfw-t2v.hf.space";
const API_NAME = "generate_video";

function parseSsePayload(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return raw; }
}

function isVideoPath(value: string): boolean {
  const lower = value.toLowerCase().split(/[?#]/, 1)[0];
  return [".mp4", ".webm", ".mov", ".m4v"].some(ext => lower.endsWith(ext));
}

function findVideoFile(value: unknown, seen = new Set<unknown>()): string | null {
  if (typeof value === "string") {
    if (value.startsWith("https://") || value.startsWith("/file=") || value.startsWith("file=") || isVideoPath(value)) return value;
    return null;
  }
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideoFile(item, seen);
      if (found) return found;
    }
    return null;
  }
  const obj = value as Record<string, unknown>;
  const mime = typeof obj.mime_type === "string" ? obj.mime_type : "";
  const name = typeof obj.orig_name === "string" ? obj.orig_name : "";
  const url = typeof obj.url === "string" ? obj.url : "";
  const path = typeof obj.path === "string" ? obj.path : "";
  if (url && (mime.startsWith("video/") || isVideoPath(url) || isVideoPath(name))) return url;
  if (path && (mime.startsWith("video/") || isVideoPath(path) || isVideoPath(name))) return path;
  for (const child of Object.values(obj)) {
    const found = findVideoFile(child, seen);
    if (found) return found;
  }
  return null;
}

function absoluteFileUrl(value: string): string {
  let normalized = value.startsWith("file=") ? "/" + value : value;
  if (normalized.startsWith("/tmp/")) normalized = "/gradio_api/file=" + normalized;
  const url = new URL(normalized, SPACE);
  if (url.protocol !== "https:" || !url.hostname.endsWith("hf.space")) {
    throw new Error("أعاد مزود الفيديو رابط ملف غير متوقع.");
  }
  return url.toString();
}

export async function GET(_req: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await context.params;
    if (!taskId || taskId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      return NextResponse.json({ error: "معرّف مهمة الفيديو غير صالح." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch(`${SPACE}/gradio_api/call/${API_NAME}/${encodeURIComponent(taskId)}`, {
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
        signal: controller.signal
      });
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      clearTimeout(timeout);
      return NextResponse.json({
        status: response.status === 404 ? "NOT_FOUND" : "FAILED",
        error: detail.slice(0, 700) || "تعذر قراءة حالة مهمة الفيديو من Hugging Face."
      }, { status: response.status === 404 ? 404 : 502 });
    }
    if (!response.body) {
      clearTimeout(timeout);
      return NextResponse.json({ status: "RUNNING", message: "المهمة قيد التنفيذ ولم يصل تحديث بعد." });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "";
    let latestUpdate: unknown = null;

    const processBlock = (block: string) => {
      let dataText = "";
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataText += (dataText ? "\n" : "") + line.slice(5).trim();
      }
      if (!dataText) return null;
      const payload = parseSsePayload(dataText);
      if (eventName === "error") {
        const message = typeof payload === "string" ? payload : JSON.stringify(payload);
        return { status: "FAILED", error: message.slice(0, 1200) };
      }
      if (eventName === "complete") {
        const videoPath = findVideoFile(payload);
        if (!videoPath) return { status: "FAILED", error: "اكتمل رد مزود الفيديو، لكن لم أجد رابط ملف فيديو ضمن النتيجة.", details: payload };
        try {
          return { status: "COMPLETED", videoUrl: absoluteFileUrl(videoPath) };
        } catch (error) {
          return { status: "FAILED", error: error instanceof Error ? error.message : "رابط الفيديو غير صالح." };
        }
      }
      if (eventName === "generating") latestUpdate = payload;
      return null;
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const result = processBlock(block);
          if (result) {
            await reader.cancel().catch(() => {});
            return NextResponse.json(result);
          }
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) {
        const result = processBlock(buffer);
        if (result) return NextResponse.json(result);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        return NextResponse.json({ status: "RUNNING", message: "الاتصال انقطع أثناء الانتظار؛ أعد تحديث الحالة بعد قليل." });
      }
    } finally {
      clearTimeout(timeout);
    }
    return NextResponse.json({
      status: "RUNNING",
      message: latestUpdate ? "ما زال نموذج Wan 2.2 يعالج المشهد." : "المهمة في طابور الانتظار أو ما زالت قيد التنفيذ."
    });
  } catch (error) {
    return NextResponse.json({
      status: "RUNNING",
      error: error instanceof Error ? error.message : "تعذر متابعة مهمة الفيديو."
    }, { status: 502 });
  }
}
