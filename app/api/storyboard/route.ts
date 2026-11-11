import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, style, duration, audience, reference } = body ?? {};
    if (typeof idea !== "string" || idea.trim().length < 12) {
      return NextResponse.json({ error: "اكتب فكرة واضحة لا تقل عن 12 حرفًا." }, { status: 400 });
    }

    // Local/open-source LLM only. No paid hosted model is called by default.
    const base = process.env.OLLAMA_API_URL?.trim().replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
    if (!base) {
      return NextResponse.json({
        error: "التوليد النصي المدفوع معطل احترامًا لاختيارك. لتوليد السيناريو مجانًا، شغّل Ollama وأضف OLLAMA_API_URL وOLLAMA_MODEL إلى إعدادات الخادم. راجع README."
      }, { status: 503 });
    }

    const instructions = `أنت كاتب سيناريو ومخرج فني متخصص في الأفلام الدينية المسيحية باللغة العربية. أنشئ معالجة وسيناريو أوليًا محترمًا ودقيقًا. لا تختلق اقتباسات كتابية أو تنسب أقوالًا إلى آباء الكنيسة دون مصدر. أخرج JSON صالحًا فقط بهذا الشكل:
{
"title":"عنوان الفيلم","logline":"جملة تعريفية","synopsis":"ملخص موجز",
"visualBible":{"world":"وصف الحقبة والمكان والبيئة","palette":"لوحة الألوان والإضاءة","continuity":"قواعد الاستمرارية البصرية","styleGuide":"دليل فني موحد لجميع اللقطات"},
"characters":[{"name":"الاسم","description":"وصف ثابت للشخصية: العمر التقريبي والملامح والشعر والملابس والسمات","visualPrompt":"English character reference prompt, full body, neutral background, consistent costume and face"}],
"scenes":[{"number":1,"title":"عنوان المشهد","duration":"المدة التقديرية","visual":"وصف بصري تفصيلي","camera":"حركة الكاميرا والتكوين","dialogue":"الحوار مع تمييز المتحدث","narration":"التعليق الصوتي","prompt":"وصف بصري باللغة الإنجليزية لمولد فيديو","imagePrompt":"English still-image prompt for this shot","videoPrompt":"English image-to-video or text-to-video prompt describing action and camera movement","negativePrompt":"English exclusions: text, logos, modern objects, inconsistent faces, extra limbs","audioDesign":"المؤثرات والأجواء الصوتية والموسيقى المناسبة"}],
"accuracyNotes":["ملاحظات التوثيق والنقاط التي تحتاج مراجعة"]
}
اجعل عدد المشاهد مناسبًا للمدة، وراعِ الترابط الدرامي واحترام العقيدة والتقاليد القبطية الأرثوذكسية عند صلتها بالموضوع. إذا كانت القصة كتابية فالتزم بأحداث النص المعروف ولا تعرض الإضافات الدرامية على أنها حقيقة. أشر إلى المراجع بدل اختلاق اقتباسات حرفية. أنشئ visualBible تفصيليًا وvisualPrompt لكل شخصية، ولكل مشهد imagePrompt وvideoPrompt وnegativePrompt وaudioDesign. يجب أن تتضمن أوصاف التوليد الإنجليزية ثبات الوجه والملابس والحقبة، وألا تحتوي على كتابة أو شعارات داخل الصورة.`;

    const response = await fetch(base + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: "الفكرة: " + idea + "\\nالطابع البصري: " + style + "\\nالمدة: " + duration + "\\nالجمهور: " + audience + "\\nالمرجع: " + reference }
        ],
        options: { temperature: 0.7 }
      }),
      signal: AbortSignal.timeout(55000),
      cache: "no-store"
    });
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ error: payload.error || "تعذر الاتصال بخادم Ollama المحلي." }, { status: response.status });
    const output = payload.message?.content;
    if (!output) throw new Error("لم يُرجع النموذج المحلي نص السيناريو.");
    const storyboard = JSON.parse(output);
    if (!storyboard.title || !Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) throw new Error("السيناريو الناتج غير مكتمل.");
    storyboard.visualBible ??= { world: "", palette: "", continuity: "", styleGuide: "" };
    storyboard.characters = Array.isArray(storyboard.characters) ? storyboard.characters : [];
    storyboard.scenes = storyboard.scenes.map((scene: any, index: number) => ({ number: index + 1, ...scene, imagePrompt: scene.imagePrompt || scene.prompt || "", videoPrompt: scene.videoPrompt || scene.prompt || "", negativePrompt: scene.negativePrompt || "text, logos, watermark, inconsistent character appearance, distorted anatomy", audioDesign: scene.audioDesign || "" }));
    return NextResponse.json({ storyboard, provider: "Ollama (local open-source model)" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء السيناريو." }, { status: 500 });
  }
}
