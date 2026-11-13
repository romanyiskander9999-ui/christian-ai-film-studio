import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const base = process.env.COMFYUI_API_URL?.trim().replace(/\/$/, "");
    if (!base) return NextResponse.json({ error: "COMFYUI_API_URL غير مضبوط." }, { status: 503 });
    const { id } = await context.params;
    if (!/^[a-f0-9-]{8,80}$/i.test(id)) return NextResponse.json({ error: "رقم المهمة غير صالح." }, { status: 400 });
    const response = await fetch(base + "/history/" + encodeURIComponent(id), { cache: "no-store", signal: AbortSignal.timeout(20000) });
    const history = await response.json();
    if (!response.ok) return NextResponse.json({ error: "تعذر جلب سجل ComfyUI.", details: history }, { status: response.status });
    const entry = history[id];
    if (!entry) return NextResponse.json({ taskId: id, status: "RUNNING", outputs: [] });
    const outputs: string[] = [];
    for (const node of Object.values(entry.outputs || {}) as any[]) {
      for (const kind of ["videos", "gifs"]) {
        for (const item of node?.[kind] || []) {
          const query = new URLSearchParams({ filename: item.filename, subfolder: item.subfolder || "", type: item.type || "output" });
          outputs.push(base + "/view?" + query.toString());
        }
      }
    }
    const status = entry.status?.status_str === "success" ? "COMPLETED" : entry.status?.status_str || "RUNNING";
    return NextResponse.json({ taskId: id, status, outputs, videoUrl: outputs[0] || "" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر متابعة مهمة ComfyUI." }, { status: 500 });
  }
}
