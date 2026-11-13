import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await context.params;
    if (!taskId || taskId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      return NextResponse.json({ error: "معرّف مهمة ComfyUI غير صالح." }, { status: 400 });
    }
    const base = process.env.COMFYUI_API_URL?.trim().replace(/\/$/, "");
    if (!base) {
      return NextResponse.json({ error: "لم يتم ضبط COMFYUI_API_URL على خادم التطبيق. لا يستطيع Vercel الوصول تلقائيًا إلى ComfyUI الموجود على جهازك." }, { status: 503 });
    }
    const response = await fetch(`${base}/history/${encodeURIComponent(taskId)}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) return NextResponse.json({ error: "تعذر قراءة سجل ComfyUI: " + response.status }, { status: 502 });
    const history = await response.json();
    const entry = history?.[taskId] || history;
    if (!entry?.outputs) {
      const status = entry?.status?.status_str;
      if (status === "error") return NextResponse.json({ status: "FAILED", error: "فشل ComfyUI في تنفيذ Workflow." });
      return NextResponse.json({ status: "IN_PROGRESS" });
    }
    for (const output of Object.values(entry.outputs) as any[]) {
      for (const key of ["videos", "gifs", "images"]) {
        const files = Array.isArray(output?.[key]) ? output[key] : [];
        const file = files.find((item: any) => item?.filename);
        if (file) {
          const params = new URLSearchParams({
            filename: String(file.filename),
            subfolder: String(file.subfolder || ""),
            type: String(file.type || "output")
          });
          return NextResponse.json({
            status: "COMPLETED",
            videoUrl: `${base}/view?${params.toString()}`,
            fileName: String(file.filename)
          });
        }
      }
    }
    return NextResponse.json({ status: "COMPLETED", error: "اكتملت المهمة لكن لم يعثر ComfyUI على ملف فيديو ضمن المخرجات." });
  } catch (error) {
    return NextResponse.json({ status: "IN_PROGRESS", error: error instanceof Error ? error.message : "تعذر متابعة ComfyUI." });
  }
}
