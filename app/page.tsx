'use client';

import { useEffect, useState } from "react";

type Scene = { number: number; title: string; duration: string; visual: string; camera: string; dialogue: string; narration: string; prompt: string; imagePrompt?: string; videoPrompt?: string; negativePrompt?: string; audioDesign?: string };
type Storyboard = { title: string; logline: string; synopsis: string; visualBible?: { world: string; palette: string; continuity: string; styleGuide: string }; characters: { name: string; description: string; visualPrompt?: string }[]; scenes: Scene[]; accuracyNotes: string[] };

const samples = [
  ["الابن الضال", "قصة الابن الضال: شاب يطلب ميراثه ويسافر بعيدًا، ثم يبدد أمواله ويعود نادمًا إلى أبيه الذي يستقبله بمحبة وغفران."],
  ["يوسف الصديق", "قصة يوسف الصديق من حسد إخوته وبيعه، إلى السجن ثم تفسير الأحلام ولقائه بإخوته ومسامحتهم."],
  ["السامري الصالح", "قصة السامري الصالح الذي يساعد رجلًا جريحًا على الطريق رغم اختلافه عنه، ليظهر معنى المحبة العملية."]
] as const;

export default function Home() {
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState("سينمائي تاريخي واقعي");
  const [duration, setDuration] = useState("3-5 دقائق");
  const [audience, setAudience] = useState("الأسرة والأطفال");
  const [reference, setReference] = useState("الكتاب المقدس");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [active, setActive] = useState(0);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("alyanbo3-film-studio-project");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.board?.title && Array.isArray(parsed.board.scenes)) {
          setBoard(parsed.board);
          setIdea(parsed.idea || "");
          setSavedAt(parsed.savedAt || "تم استرجاع المشروع");
        }
      }
    } catch { localStorage.removeItem("alyanbo3-film-studio-project"); }
  }, []);

  useEffect(() => {
    if (!board) return;
    const stamp = new Date().toLocaleString("ar-EG");
    try {
      localStorage.setItem("alyanbo3-film-studio-project", JSON.stringify({ board, idea, savedAt: stamp }));
      setSavedAt(stamp);
    } catch { setSavedAt("تعذر الحفظ على هذا الجهاز"); }
  }, [board, idea]);

  function exportScript() {
    if (!board) return;
    const lines = [board.title, "", board.logline, "", "ملخص الفيلم", board.synopsis, "", "الدليل البصري الموحد", board.visualBible?.world || "", board.visualBible?.palette || "", board.visualBible?.continuity || "", board.visualBible?.styleGuide || "", "", "الشخصيات", ...(board.characters || []).flatMap(c => [`${c.name}: ${c.description}`, `مرجع الشخصية: ${c.visualPrompt || ""}`]), "", "المشاهد", ...(board.scenes || []).flatMap(s => [`\nالمشهد ${s.number}: ${s.title} (${s.duration})`, `الصورة: ${s.visual}`, `الكاميرا: ${s.camera}`, `الحوار: ${s.dialogue}`, `التعليق الصوتي: ${s.narration}`, `وصف الصورة: ${s.imagePrompt || s.prompt}`, `وصف الفيديو: ${s.videoPrompt || s.prompt}`, `المؤثرات الصوتية: ${s.audioDesign || ""}`, `المستبعدات: ${s.negativePrompt || ""}`]), "", "ملاحظات التوثيق", ...(board.accuracyNotes || []).map(n => `- ${n}`)];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${board.title.replace(/[^\p{L}\p{N}-]+/gu, "-")}.txt`; a.click(); URL.revokeObjectURL(url);
  }

  function clearSavedProject() {
    if (!confirm("هل تريد حذف المشروع المحفوظ من هذا الجهاز؟")) return;
    localStorage.removeItem("alyanbo3-film-studio-project"); setBoard(null); setIdea(""); setSavedAt("");
  }

  async function generate() {
    if (idea.trim().length < 12) { setError("اكتب فكرة القصة بتفاصيل أكثر أولًا."); return; }
    setLoading(true); setError(""); setBoard(null);
    try {
      const response = await fetch("/api/storyboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, style, duration, audience, reference })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر إنشاء السيناريو.");
      setBoard(data.storyboard);
      setActive(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ غير متوقع.");
    } finally { setLoading(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="crossMark">✝</span><div><b>استوديو الينبوع السينمائي</b><small>CHRISTIAN AI FILM STUDIO</small></div></div>
      <span className="version">الإصدار التجريبي 0.1</span>
    </header>

    <section className="hero">
      <div>
        <span className="eyebrow">من الفكرة إلى السيناريو السينمائي</span>
        <h1>اصنع قصتك<br/><em>بروح سينمائية</em></h1>
        <p>حوّل القصص الكتابية وسير القديسين إلى سيناريوهات ومشاهد منظمة، تمهيدًا لإنتاج فيلم متكامل بالصورة والصوت.</p>
        <div className="pills"><span>سيناريو عربي</span><span>تقسيم المشاهد</span><span>ثبات الشخصيات</span></div>
      </div>
      <div className="poster"><div className="halo"></div><span>✝</span><small>STORY · FAITH · CINEMA</small></div>
    </section>

    <section className="panel">
      <div className="sectionTitle"><div><span className="eyebrow">01 / ابدأ مشروعك</span><h2>ما القصة التي تريد تحويلها إلى فيلم؟</h2></div><span className="tag">إعداد المشروع</span></div>
      <label className="field">فكرة القصة أو النص الأساسي<textarea value={idea} onChange={e => setIdea(e.target.value)} rows={5} placeholder="اكتب القصة أو الصق النص أو اشرح الفكرة التي تريد تحويلها إلى فيلم..." /></label>
      <div className="samples"><span>جرّب مثالًا:</span>{samples.map(([label, value]) => <button key={label} onClick={() => setIdea(value)}>{label}</button>)}</div>
      <div className="grid">
        <label className="field">الطابع البصري<select value={style} onChange={e => setStyle(e.target.value)}><option>سينمائي تاريخي واقعي</option><option>رسوم متحركة ثلاثية الأبعاد</option><option>دراما تاريخية ملحمية</option><option>وثائقي هادئ</option><option>سينمائي مناسب للأطفال</option></select></label>
        <label className="field">مدة الفيلم<select value={duration} onChange={e => setDuration(e.target.value)}><option>60-90 ثانية</option><option>2-3 دقائق</option><option>3-5 دقائق</option><option>5-10 دقائق</option><option>10-20 دقيقة</option></select></label>
        <label className="field">الجمهور المستهدف<select value={audience} onChange={e => setAudience(e.target.value)}><option>الأسرة والأطفال</option><option>الشباب</option><option>جميع الأعمار</option><option>المهتمون بالدراسات الكتابية</option></select></label>
        <label className="field">المرجع الأساسي<select value={reference} onChange={e => setReference(e.target.value)}><option>الكتاب المقدس</option><option>سير القديسين والتراث القبطي</option><option>قصة تعليمية مستوحاة من القيم المسيحية</option><option>نص أقدمه بنفسي مع مراجع</option></select></label>
      </div>
      <div className="actions"><p>سيُنشأ السيناريو أولًا لمراجعته قبل الانتقال إلى إنتاج الفيديو.</p><button className="primary" onClick={generate} disabled={loading}>{loading ? "جارٍ إعداد السيناريو..." : "✦ إنشاء السيناريو والمشاهد ←"}</button></div>
      {error && <div className="error">{error}</div>}
    </section>

    {board && <section className="panel results">
      <div className="sectionTitle"><div><span className="eyebrow">02 / مخرجات الذكاء الاصطناعي</span><h2>{board.title}</h2><p className="muted">{board.logline}</p><p className="muted">حفظ تلقائي على هذا الجهاز: {savedAt || "جارٍ الحفظ"}</p></div><div className="resultActions"><button className="secondary" onClick={exportScript}>تنزيل السيناريو TXT</button><button className="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(board, null, 2))}>نسخ البيانات JSON</button><button className="secondary dangerButton" onClick={clearSavedProject}>حذف المشروع المحفوظ</button></div></div>
      <div className="summary"><b>ملخص الفيلم</b><p>{board.synopsis}</p></div>
      {board.visualBible && <div className="summary"><b>الدليل البصري الموحد للفيلم</b><p><strong>العالم والحقبة:</strong> {board.visualBible.world}</p><p><strong>الألوان والإضاءة:</strong> {board.visualBible.palette}</p><p><strong>قواعد الاستمرارية:</strong> {board.visualBible.continuity}</p><p><strong>التوجيه الفني:</strong> {board.visualBible.styleGuide}</p></div>}<h3>الشخصيات وثبات ملامحها</h3><div className="characters">{board.characters?.map((c, i) => <article key={i}><b>{c.name}</b><p>{c.description}</p>{c.visualPrompt && <div className="prompt">{c.visualPrompt}</div>}</article>)}</div>
      <div className="sceneLayout"><aside className="sceneList"><h3>المشاهد ({board.scenes?.length || 0})</h3>{board.scenes?.map((s, i) => <button className={active === i ? "sceneTab selected" : "sceneTab"} key={i} onClick={() => setActive(i)}><small>مشهد {String(i + 1).padStart(2, "0")}</small><b>{s.title}</b><small>{s.duration}</small></button>)}</aside>
        {board.scenes?.[active] && <article className="sceneDetail"><span className="eyebrow">SCENE {String(active + 1).padStart(2, "0")}</span><h3>{board.scenes[active].title}</h3><small>{board.scenes[active].duration}</small>
          <h4>الوصف البصري</h4><p>{board.scenes[active].visual}</p><h4>حركة الكاميرا</h4><p>{board.scenes[active].camera}</p><h4>الحوار</h4><p>{board.scenes[active].dialogue || "لا يوجد حوار."}</p><h4>التعليق الصوتي</h4><p>{board.scenes[active].narration || "لا يوجد تعليق صوتي."}</p><h4>وصف الصورة المرجعية</h4><div className="prompt">{board.scenes[active].imagePrompt || board.scenes[active].prompt}</div><button className="secondary" onClick={() => navigator.clipboard.writeText(board.scenes[active].imagePrompt || board.scenes[active].prompt)}>نسخ وصف الصورة</button>
          <h4>وصف حركة الفيديو</h4><div className="prompt">{board.scenes[active].videoPrompt || board.scenes[active].prompt}</div><button className="secondary" onClick={() => navigator.clipboard.writeText(board.scenes[active].videoPrompt || board.scenes[active].prompt)}>نسخ وصف الفيديو</button>
          <h4>الأصوات والمؤثرات</h4><p>{board.scenes[active].audioDesign || "لم تحدد مؤثرات صوتية."}</p><h4>العناصر المستبعدة</h4><div className="prompt">{board.scenes[active].negativePrompt || "لا توجد."}</div>
          <div className="sceneNav"><button disabled={active === 0} onClick={() => setActive(v => v - 1)}>السابق</button><button disabled={active === board.scenes.length - 1} onClick={() => setActive(v => v + 1)}>التالي</button></div>
        </article>}
      </div>
      {board.accuracyNotes?.length > 0 && <div className="summary"><b>ملاحظات المراجعة والتوثيق</b><ul>{board.accuracyNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
      <div className="nextPhase"><b>المرحلة التالية: توليد الصور والفيديو والصوت</b><p>تم تجهيز دليل بصري موحد، وأوصاف منفصلة للصورة وحركة الفيديو والصوت لكل مشهد. لا يزال إنتاج ملفات الفيديو الفعلية وMP4 يتطلب ربط مزود توليد خارجي.</p></div>
    </section>}

    <section className="pipeline"><span className="eyebrow">03 / خط الإنتاج</span><h2>من السيناريو إلى الفيلم النهائي</h2><div className="steps">{[["01","السيناريو","بناء القصة والحوار"],["02","الشخصيات","مرجع بصري موحد"],["03","المشاهد","صور ولقطات متحركة"],["04","الصوت","أداء عربي وموسيقى"],["05","المونتاج","تركيب وتصدير MP4"]].map(x => <div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></div>)}</div></section>
    <footer><b>استوديو الينبوع السينمائي</b><span>راجع النصوص والمراجع الدينية قبل النشر.</span></footer>
  </main>;
}
