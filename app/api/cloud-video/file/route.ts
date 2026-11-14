import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOST = "mastap-wan22-remix-sfw-t2v.hf.space";

async function proxy(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "رابط ملف الفيديو غير موجود." }, { status: 400 });

  let url: URL;
  try { url = new URL(raw); } catch { return NextResponse.json({ error: "رابط ملف الفيديو غير صالح." }, { status: 400 }); }
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST || !url.pathname.includes("file=")) {
    return NextResponse.json({ error: "مصدر الفيديو غير مسموح." }, { status: 403 });
  }

  const headers = new Headers();
  const range = req.headers.get("range");
  if (range) headers.set("Range", range);

  try {
    const upstream = await fetch(url.toString(), { method: req.method, headers, cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "تعذر تنزيل ملف الفيديو من Hugging Face.", upstreamStatus: upstream.status }, { status: upstream.status || 502 });
    }
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    responseHeaders.set("Cache-Control", "private, max-age=1800");
    responseHeaders.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    for (const key of ["content-length", "content-range"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "فشل الاتصال بملف الفيديو." }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function HEAD(req: NextRequest) {
  return proxy(req);
}
