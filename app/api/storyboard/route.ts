import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, style, duration, audience, reference } = body ?? {};
    if (typeof idea !== "string" || idea.trim().length < 12) {
      return NextResponse.json({ error: "اكتب فكرة واضحة لا تقل عن 12 حرفًا." }, { status: 400 });
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "لم يتم إعداد مفتاح OpenAI. أضف OPENAI_API_KEY في متغيرات البيئة على Vercel." }, { status: 503 });
    }

    const instructions = `أنت كاتب سيناريو ومخرج فني متخصص في الأفلام الدينية المسيحية باللغة العربية. أنشئ معالجة وسيناريو أوليًا محترمًا ودقيقًا. لا تختلق اقتباسات كتابية أو تنسب أقوالًا إلى آباء الكنيسة دون مصدر. أخرج JSON صالحًا فقط بهذا الشكل:
{
"title":"عنوان الفيلم","logline":"جملة تعريفية","synopsis":"ملخص موجز",
"characters":[{"name":"الاسم","description":"وصف ثابت للشخصية: العمر التقريبي والملامح والشعر والملابس والسمات"}],
"scenes":[{"number":1,"title":"عنوان المشهد","duration":"المدة التقديرية","visual":"وصف بصري تفصيلي","camera":"حركة الكاميرا والتكوين","dialogue":"الحوار مع تمييز المتحدث","narration":"التعليق الصوتي","prompt":"وصف بصري باللغة الإنجليزية لمولد فيديو، بلا كتابة أو شعارات داخل الصورة، مع وصف ثبات الشخصية"}],
"accuracyNotes":["ملاحظات التوثيق والنقاط التي تحتاج مراجعة"]
}
اجعل عدد المشاهد مناسبًا للمدة، وراعِ الترابط الدرامي واحترام العقيدة والتقاليد القبطية الأرثوذكسية عند صلتها بالموضوع. إذا كانت القصة كتابية فالتزم بأحداث النص المعروف ولا تعرض الإضافات الدرامية على أنها حقيقة. أشر إلى المراجع بدل اختلاق اقتباسات حرفية.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions,
        input: "الفكرة: " + idea + "\nالطابع البصري: " + style + "\nالمدة: " + duration + "\nالجمهور: " + audience + "\nالمرجع: " + reference,
        text: { format: { type: "json_object" } }
      })
    });
    const payload = await response.json();
    if (!response.ok) return NextResponse.json({ error: payload.error?.message || "تعذر الاتصال بخدمة كتابة السيناريو." }, { status: response.status });
    const output = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
    if (!output) throw new Error("لم تُرجع خدمة الذكاء الاصطناعي نص السيناريو.");
    const storyboard = JSON.parse(output);
    if (!storyboard.title || !Array.isArray(storyboard.scenes)) throw new Error("السيناريو الناتج غير مكتمل.");
    return NextResponse.json({ storyboard });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء السيناريو." }, { status: 500 });
  }
}
