import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

function config() {
  const base = process.env.COMFYUI_API_URL?.trim().replace(/\/$/, "");
  const raw = process.env.COMFYUI_WORKFLOW_JSON;
  const nodeId = process.env.COMFYUI_PROMPT_NODE_ID;
  const inputKey = process.env.COMFYUI_PROMPT_INPUT || "text";
  if (!base || !raw || !nodeId) throw new Error("لتفعيل Wan 2.2: أضف COMFYUI_API_URL وCOMFYUI_WORKFLOW_JSON وCOMFYUI_PROMPT_NODE_ID في إعدادات الخادم.");
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("عنوان ComfyUI يجب أن يبدأ بـ http أو https.");
  return { base, workflow: JSON.parse(raw), nodeId, inputKey };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (typeof prompt !== "string" || prompt.trim().length < 10 || prompt.length > 5000) {
      return NextResponse.json({ error: "وصف المشهد يجب أن يكون بين 10 و5000 حرف." }, { status: 400 });
    }
    const cfg = config();
    const workflow = structuredClone(cfg.workflow);
    const node = workflow[cfg.nodeId];
    if (!node || !node.inputs || !(cfg.inputKey in node.inputs)) {
      return NextResponse.json({ error: "لم نعثر على عقدة النص المحددة في Workflow. راجع COMFYUI_PROMPT_NODE_ID وCOMFYUI_PROMPT_INPUT." }, { status: 400 });
    }
    node.inputs[cfg.inputKey] = prompt.trim();
    const response = await fetch(cfg.base + "/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok || !data.prompt_id) {
      return NextResponse.json({ error: data.error?.message || data.error || "رفض ComfyUI المهمة.", details: data }, { status: response.status || 502 });
    }
    return NextResponse.json({ taskId: data.prompt_id, status: "queued", provider: "ComfyUI / Wan 2.2" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إرسال المشهد إلى خادم ComfyUI." }, { status: 500 });
  }
}
