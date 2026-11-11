'use client';

import { useEffect, useState } from "react";

type Scene = { number: number; title: string; duration: string; visual: string; camera: string; dialogue: string; narration: string; prompt: string; imagePrompt?: string; videoPrompt?: string; negativePrompt?: string; audioDesign?: string; videoTaskId?: string; videoStatus?: string; videoUrl?: string; videoError?: string; videoFileName?: string; videoProvider?: string; cloudTaskId?: string; cloudStatus?: string };
type Storyboard = { title: string; logline: string; synopsis: string; visualBible?: { world: string; palette: string; continuity: string; styleGuide: string }; characters: { name: string; description: string; visualPrompt?: string }[]; scenes: Scene[]; accuracyNotes: string[] };

const samples = [
  ["الابن الضال", "قصة الابن الضال: شاب يطلب ميراثه ويسافر بعيدًا، ثم يبدد أمواله ويعود نادمًا إلى أبيه الذي يستقبله بمحبة وغفران."],
  ["يوسف الصديق", "قصة يوسف الصديق من حسد إخوته وبيعه، إلى السجن ثم تفسير الأحلام ولقائه بإخوته ومسامحتهم."],
  ["السامري الصالح", "قصة السامري الصالح الذي يساعد رجلًا جريحًا على الطريق رغم اختلافه عنه، ليظهر معنى المحبة العملية."]
] as const;

export default function Home() {
  const [idea, setIdea] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:1.5b");
  const [ollamaStatus, setOllamaStatus] = useState("");
  const [ollamaBusy, setOllamaBusy] = useState(false);
  const [style, setStyle] = useState("سينمائي تاريخي واقعي");
  const [duration, setDuration] = useState("3-5 دقائق");
  const [audience, setAudience] = useState("الأسرة والأطفال");
  const [reference, setReference] = useState("الكتاب المقدس");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [active, setActive] = useState(0);
  const [savedAt, setSavedAt] = useState("");
  const [assemblyStatus, setAssemblyStatus] = useState("");
  const [assemblyBusy, setAssemblyBusy] = useState(false);
  const [soundtrackUrl, setSoundtrackUrl] = useState("");
  const [soundtrackName, setSoundtrackName] = useState("");
  const [finalFilmUrl, setFinalFilmUrl] = useState("");

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("alyanbo3-ollama-settings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (typeof settings.url === "string") setOllamaUrl(settings.url);
        if (typeof settings.model === "string") setOllamaModel(settings.model);
      }
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

  async function generateCloudVideo(index: number) {
    if (!board) return;
    const scene = board.scenes[index];
    const prompt = [scene.videoPrompt || scene.prompt || scene.visual, scene.negativePrompt ? "Negative prompt: " + scene.negativePrompt : ""].filter(Boolean).join("\\n\\n");
    setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, cloudStatus: "SUBMITTING", videoError: "" } : s) }) : prev);
    try {
      const response = await fetch("/api/cloud-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر بدء التوليد السحابي.");
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, cloudTaskId: data.taskId, cloudStatus: data.status || "QUEUED", videoProvider: "huggingface-wan", videoError: "" } : s) }) : prev);
    } catch (e) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, cloudStatus: "FAILED", videoError: e instanceof Error ? e.message : "حدث خطأ أثناء إرسال المهمة." } : s) }) : prev);
    }
  }

  async function refreshCloudVideo(index: number) {
    const taskId = board?.scenes[index]?.cloudTaskId;
    if (!taskId) return;
    try {
      const response = await fetch("/api/cloud-video/" + encodeURIComponent(taskId), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر متابعة التوليد السحابي.");
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, cloudStatus: data.status, videoUrl: data.videoUrl || s.videoUrl, videoError: data.error || "" } : s) }) : prev);
    } catch (e) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoError: e instanceof Error ? e.message : "حدث خطأ أثناء تحديث المهمة." } : s) }) : prev);
    }
  }

  async function generateLocalVideo(index: number) {
    if (!board) return;
    const scene = board.scenes[index];
    const prompt = [scene.videoPrompt || scene.prompt || scene.visual, scene.negativePrompt ? "Negative prompt: " + scene.negativePrompt : ""].filter(Boolean).join("\n\n");
    setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoStatus: "SUBMITTING", videoProvider: "comfyui", videoError: "" } : s) }) : prev);
    try {
      const response = await fetch("/api/local-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر بدء التوليد على خادمك.");
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoTaskId: data.taskId, videoStatus: data.status || "queued", videoProvider: "comfyui", videoError: "" } : s) }) : prev);
    } catch (e) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoStatus: "FAILED", videoError: e instanceof Error ? e.message : "حدث خطأ" } : s) }) : prev);
    }
  }

  async function refreshLocalVideo(index: number) {
    const taskId = board?.scenes[index]?.videoTaskId;
    if (!taskId) return;
    try {
      const response = await fetch("/api/local-video/" + taskId, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة ComfyUI.");
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoStatus: data.status, videoUrl: data.videoUrl || s.videoUrl, videoError: "" } : s) }) : prev);
    } catch (e) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoError: e instanceof Error ? e.message : "حدث خطأ" } : s) }) : prev);
    }
  }

  function attachSceneVideo(index: number, file: File) {
    if (!file.type.startsWith("video/")) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoError: "اختر ملف فيديو صالحًا." } : s) }) : prev);
      return;
    }
    const url = URL.createObjectURL(file);
    setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoUrl: url, videoFileName: file.name, videoStatus: "LOCAL_FILE", videoError: "" } : s) }) : prev);
  }

  function copyScenePrompt(index: number) {
    if (!board) return;
    const scene = board.scenes[index];
    const prompt = [scene.videoPrompt || scene.prompt || scene.visual, scene.negativePrompt ? "Negative prompt: " + scene.negativePrompt : ""].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(prompt);
  }

  async function assembleFilm() {
    if (!board) return;
    const clips = board.scenes.map((scene, index) => ({ scene, index })).filter(({ scene }) => !!scene.videoUrl);
    if (clips.length < 1) {
      setAssemblyStatus("أنتج أو ارفع مقطع فيديو واحدًا على الأقل قبل التجميع.");
      return;
    }
    setAssemblyBusy(true);
    setAssemblyStatus("جارٍ تحميل أداة المونتاج وتجهيز المقاطع...");
    setFinalFilmUrl("");
    let ffmpeg: any;
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL, fetchFile } = await import("@ffmpeg/util");
      ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        setAssemblyStatus("جارٍ تجميع الفيلم: " + Math.max(0, Math.min(100, Math.round(progress * 100))) + "%");
      });
      const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(base + "/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL(base + "/ffmpeg-core.wasm", "application/wasm")
      });
      const names: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        setAssemblyStatus("جارٍ تجهيز المشهد " + (i + 1) + " من " + clips.length + "...");
        const inputName = "input_" + i + ".bin";
        const outputName = "scene_" + i + ".mp4";
        const clipResponse = await fetch(clips[i].scene.videoUrl!, { mode: "cors" });
        if (!clipResponse.ok) throw new Error("تعذر تنزيل فيديو المشهد " + (clips[i].index + 1) + ". ارفع المقطع من جهازك ثم أعد المحاولة.");
        const clipBlob = await clipResponse.blob();
        await ffmpeg.writeFile(inputName, await fetchFile(clipBlob));
        const result = await ffmpeg.exec([
          "-i", inputName, "-map", "0:v:0", "-vf",
          "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p",
          "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-movflags", "+faststart", outputName
        ]);
        if (result !== 0) throw new Error("تعذر تجهيز أحد المقاطع. تأكد أن الملفات فيديو صالح.");
        await ffmpeg.deleteFile(inputName);
        names.push(outputName);
      }
      const concatText = names.map(name => "file '" + name + "'").join("\n");
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(concatText));
      let output = "film.mp4";
      if (soundtrackUrl) {
        setAssemblyStatus("جارٍ إضافة التعليق الصوتي أو الموسيقى...");
        const audioResponse = await fetch(soundtrackUrl);
        if (!audioResponse.ok) throw new Error("تعذر قراءة الملف الصوتي المرفوع.");
        await ffmpeg.writeFile("soundtrack.bin", await fetchFile(await audioResponse.blob()));
        const result = await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-stream_loop", "-1", "-i", "soundtrack.bin", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output]);
        if (result !== 0) throw new Error("تعذر دمج الملف الصوتي. جرّب ملف MP3 أو WAV.");
      } else {
        const result = await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c:v", "copy", "-an", "-movflags", "+faststart", output]);
        if (result !== 0) throw new Error("تعذر دمج المشاهد. حاول تقليل عدد المقاطع أو أحجامها.");
      }
      const bytes = await ffmpeg.readFile(output);
      const blob = new Blob([bytes], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setFinalFilmUrl(url);
      setAssemblyStatus("اكتمل الفيلم بنجاح. يمكنك معاينته وتنزيله.");
    } catch (e) {
      setAssemblyStatus(e instanceof Error ? e.message : "حدث خطأ أثناء تجميع الفيلم.");
    } finally {
      if (ffmpeg) { try { await ffmpeg.terminate(); } catch {} }
      setAssemblyBusy(false);
    }
  }

  function attachSoundtrack(file: File) {
    if (!file.type.startsWith("audio/")) {
      setAssemblyStatus("اختر ملفًا صوتيًا صالحًا مثل MP3 أو WAV.");
      return;
    }
    if (soundtrackUrl) URL.revokeObjectURL(soundtrackUrl);
    setSoundtrackUrl(URL.createObjectURL(file));
    setSoundtrackName(file.name);
    setFinalFilmUrl("");
  }

  function clearSavedProject() {
    if (!confirm("هل تريد حذف المشروع المحفوظ من هذا الجهاز؟")) return;
    localStorage.removeItem("alyanbo3-film-studio-project"); setBoard(null); setIdea(""); setSavedAt("");
  }

  function saveOllamaSettings() {
    const url = (ollamaUrl.trim().endsWith("/") ? ollamaUrl.trim().slice(0, -1) : ollamaUrl.trim());
    if (!(url.startsWith("http://") || url.startsWith("https://")) ) { setOllamaStatus("اكتب عنوانًا يبدأ بـ http:// أو https://"); return; }
    localStorage.setItem("alyanbo3-ollama-settings", JSON.stringify({ url, model: ollamaModel.trim() }));
    setOllamaUrl(url);
    setOllamaStatus("تم حفظ الإعدادات على هذا المتصفح.");
  }

  async function testOllama() {
    const base = (ollamaUrl.trim().endsWith("/") ? ollamaUrl.trim().slice(0, -1) : ollamaUrl.trim());
    setOllamaBusy(true);
    setOllamaStatus("جارٍ الاتصال بـ Ollama...");
    try {
      const response = await fetch(base + "/api/tags", { cache: "no-store" });
      if (!response.ok) throw new Error("استجاب Ollama برمز " + response.status);
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models.map((m: { name?: string }) => m.name).filter(Boolean) : [];
      const found = models.some((name: string) => name === ollamaModel || name.startsWith(ollamaModel + ":"));
      setOllamaStatus(found ? "اتصال ناجح، والنموذج " + ollamaModel + " جاهز." : "اتصال ناجح، لكن النموذج غير مثبت. نفّذ: ollama pull " + ollamaModel + ". النماذج الموجودة: " + (models.join("، ") || "لا توجد نماذج"));
    } catch (e) {
      setOllamaStatus("فشل الاتصال. تأكد أن Ollama يعمل وأن OLLAMA_ORIGINS يسمح بعنوان الموقع. التفاصيل: " + (e instanceof Error ? e.message : "تعذر الاتصال"));
    } finally { setOllamaBusy(false); }
  }

  async function generate() {
    if (idea.trim().length < 12) { setError("اكتب فكرة القصة بتفاصيل أكثر أولًا."); return; }
    setLoading(true); setError(""); setBoard(null);
    try {
      const base = (ollamaUrl.trim().endsWith("/") ? ollamaUrl.trim().slice(0, -1) : ollamaUrl.trim());
      const response = await fetch(base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel.trim() || "qwen2.5:1.5b",
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: "أنت كاتب سيناريو ومخرج فني متخصص في الأفلام الدينية المسيحية باللغة العربية. أخرج JSON صالحًا فقط بالمفاتيح: title, logline, synopsis, visualBible{world,palette,continuity,styleGuide}, characters[{name,description,visualPrompt}], scenes[{number,title,duration,visual,camera,dialogue,narration,prompt,imagePrompt,videoPrompt,negativePrompt,audioDesign}], accuracyNotes. أنشئ مشاهد مترابطة مناسبة للمدة، ووصفًا بصريًا مفصلًا، ودليلًا بصريًا موحدًا، وأوصاف توليد إنجليزية لكل شخصية ومشهد. احترم العقيدة والتقاليد القبطية الأرثوذكسية. إذا كانت القصة كتابية فالتزم بأحداث النص ولا تعرض الإضافات الدرامية كحقائق. لا تختلق اقتباسات كتابية أو آبائية أو مراجع. لا تضع كتابة أو شعارات داخل الصور." },
            { role: "user", content: "الفكرة: " + idea + "\\nالطابع البصري: " + style + "\\nالمدة: " + duration + "\\nالجمهور: " + audience + "\\nالمرجع: " + reference }
          ],
          options: { temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(240000),
        cache: "no-store"
      });
      if (!response.ok) throw new Error("تعذر توليد السيناريو (" + response.status + "). تحقق من النموذج واتصال Ollama.");
      const payload = await response.json();
      const output = payload.message?.content;
      if (!output) throw new Error("لم يُرجع Ollama نص السيناريو. تأكد من تثبيت النموذج المحدد.");
      const storyboard = JSON.parse(output);
      if (!storyboard.title || !Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) throw new Error("السيناريو الناتج غير مكتمل. أعد المحاولة أو استخدم نموذجًا أقوى.");
      storyboard.visualBible ??= { world: "", palette: "", continuity: "", styleGuide: "" };
      storyboard.characters = Array.isArray(storyboard.characters) ? storyboard.characters : [];
      storyboard.scenes = storyboard.scenes.map((scene: any, index: number) => ({ number: index + 1, ...scene, imagePrompt: scene.imagePrompt || scene.prompt || "", videoPrompt: scene.videoPrompt || scene.prompt || "", negativePrompt: scene.negativePrompt || "text, logos, watermark, inconsistent character appearance, distorted anatomy", audioDesign: scene.audioDesign || "" }));
      setBoard(storyboard);
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
      <div className="localModel" style={{ marginTop: 18 }}>
        <b>محرك السيناريو المجاني — Ollama على جهازك</b>
        <p>يتصل المتصفح مباشرة ببرنامج Ollama على جهازك. لا يمر نص القصة عبر خادم مدفوع، وتُحفظ الإعدادات في هذا المتصفح.</p>
        <div className="grid">
          <label className="field">عنوان Ollama<input value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} placeholder="http://127.0.0.1:11434" /></label>
          <label className="field">اسم النموذج<input value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} placeholder="qwen2.5:1.5b" /></label>
        </div>
        <div className="videoActions" style={{ marginTop: 12 }}>
          <button type="button" className="secondary" onClick={saveOllamaSettings}>حفظ الإعدادات</button>
          <button type="button" className="secondary" onClick={testOllama} disabled={ollamaBusy}>{ollamaBusy ? "جارٍ الاختبار..." : "اختبار اتصال Ollama"}</button>
        </div>
        {ollamaStatus && <p className="muted" role="status">{ollamaStatus}</p>}
        <p className="muted">يجب السماح لنطاق الموقع في OLLAMA_ORIGINS ثم إعادة تشغيل Ollama. راجع README. لا تفتح المنفذ 11434 للإنترنت ولا تستخدم علامة *.</p>
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
          <div className="videoMaker"><b>توليد الفيديو السحابي — Wan 2.2</b>
          <p>يمكنك إرسال وصف المشهد مباشرة من هذا الزر إلى محرك Wan 2.2 على Hugging Face ومتابعة حالة المهمة من الاستوديو. الخدمة المجانية محدودة بحصة يومية وطابور انتظار، وقد تتوقف المساحة العامة مؤقتًا.</p>
          <div className="videoActions"><button className="primary" onClick={() => generateCloudVideo(active)} disabled={board.scenes[active].cloudStatus === "SUBMITTING"}>{board.scenes[active].cloudStatus === "SUBMITTING" ? "جارٍ إرسال المهمة..." : "✦ إنتاج الفيديو مباشرة مجانًا"}</button><button className="secondary" onClick={() => copyScenePrompt(active)}>نسخ وصف المشهد للفيديو</button>{board.scenes[active].cloudTaskId && <button className="secondary" onClick={() => refreshCloudVideo(active)}>تحديث حالة التوليد ({board.scenes[active].cloudStatus || "قيد الانتظار"})</button>}<a className="secondary" href="https://huggingface.co/spaces/mastaP/wan22-remix-sfw-t2v" target="_blank" rel="noreferrer">فتح محرك Wan 2.2 في نافذة مستقلة ↗</a></div>
          <div style={{ marginTop: 16, border: "1px solid #d8d0c2", borderRadius: 14, overflow: "hidden", background: "#111" }}>
            <iframe title="Wan 2.2 cloud video generator" src="https://mastap-wan22-remix-sfw-t2v.hf.space" style={{ width: "100%", height: 760, border: 0, background: "#111" }} allow="clipboard-write; fullscreen" loading="lazy" />
          </div>
          <p className="muted">يمكنك أيضًا استخدام واجهة المساحة المضمنة كخيار احتياطي يدوي. عند الضغط على زر الإنتاج المباشر، يُرسل وصف المشهد إلى خوادم Hugging Face لتوليد المقطع.</p>
          <div className="freeProviders">
            <a href="https://dreamina.capcut.com/" target="_blank" rel="noreferrer"><b>Dreamina</b><span>توليد فيديو من النص أو الصورة · رصيد مجاني حسب الحساب</span><small>فتح الموقع ↗</small></a>
            <a href="https://pixverse.ai/" target="_blank" rel="noreferrer"><b>PixVerse</b><span>مقاطع قصيرة من النصوص والصور · رصيد مجاني حسب الخطة</span><small>فتح الموقع ↗</small></a>
          </div>
          <div className="videoActions"><button className="primary" onClick={() => copyScenePrompt(active)}>نسخ وصف الفيديو والمستبعدات</button>
          <label className="secondary uploadVideo">رفع المقطع الناتج<input type="file" accept="video/*" onChange={e => { const f = e.target.files?.[0]; if (f) attachSceneVideo(active, f); e.currentTarget.value = ""; }} /></label></div>
          <div className="localModel"><b>الخيار المفتوح المصدر: ComfyUI + Wan 2.2</b><p>شغّل ComfyUI على جهاز GPU أو خادم خاص، وجهّز Workflow بصيغة API، ثم اضبط متغيرات البيئة المذكورة في دليل المشروع. لن تُفرض رسوم مزود فيديو خارجي.</p><div className="videoActions"><button className="secondary" onClick={() => generateLocalVideo(active)}>إرسال المشهد إلى Wan 2.2</button>{board.scenes[active].videoProvider === "comfyui" && board.scenes[active].videoTaskId && <button className="secondary" onClick={() => refreshLocalVideo(active)}>تحديث حالة Wan 2.2</button>}</div><a href="https://github.com/Wan-Video/Wan2.2" target="_blank" rel="noreferrer">مستودع Wan 2.2 ↗</a> · <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank" rel="noreferrer">ComfyUI ↗</a></div>
          {board.scenes[active].videoFileName && <p className="muted">المقطع المرفوع: {board.scenes[active].videoFileName} — متاح في جلسة المتصفح الحالية.</p>}
          {board.scenes[active].videoError && <p className="error">{board.scenes[active].videoError}</p>}
          {board.scenes[active].videoUrl && <video controls playsInline src={board.scenes[active].videoUrl} className="generatedVideo" />}
          </div>
          <div className="sceneNav"><button disabled={active === 0} onClick={() => setActive(v => v - 1)}>السابق</button><button disabled={active === board.scenes.length - 1} onClick={() => setActive(v => v + 1)}>التالي</button></div>
        </article>}
      </div>
      {board.accuracyNotes?.length > 0 && <div className="summary"><b>ملاحظات المراجعة والتوثيق</b><ul>{board.accuracyNotes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
      <section className="summary" style={{ marginTop: 28 }}>
        <span className="eyebrow">03 / المونتاج والتصدير</span>
        <h3>تجميع مشاهد الفيلم في ملف MP4 واحد</h3>
        <p>سيجمع الاستوديو المقاطع التي أنتجتها أو رفعتها بترتيب المشاهد. يمكنك إضافة ملف تعليق صوتي أو موسيقى بصيغة MP3 أو WAV. تتم المعالجة داخل متصفحك باستخدام FFmpeg WebAssembly ولا تُرسل المقاطع إلى خدمة مونتاج مدفوعة.</p>
        <p><strong>المقاطع الجاهزة:</strong> {board.scenes.filter(scene => !!scene.videoUrl).length} من {board.scenes.length}</p>
        <label className="secondary uploadVideo" style={{ display: "inline-flex", margin: "8px 0" }}>إضافة تعليق صوتي أو موسيقى<input type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) attachSoundtrack(file); e.currentTarget.value = ""; }} /></label>
        {soundtrackName && <p className="muted">الملف الصوتي المختار: {soundtrackName}</p>}
        <div className="videoActions"><button className="primary" disabled={assemblyBusy || board.scenes.filter(scene => !!scene.videoUrl).length < 1} onClick={assembleFilm}>{assemblyBusy ? "جارٍ تجهيز الفيلم..." : "🎬 تجميع وتنزيل الفيلم MP4"}</button></div>
        {assemblyStatus && <p className="muted" role="status">{assemblyStatus}</p>}
        {finalFilmUrl && <div style={{ marginTop: 16 }}><video controls playsInline src={finalFilmUrl} className="generatedVideo" /><p><a className="primary" href={finalFilmUrl} download={(board.title || "alyanbo3-film").replace(/[^\p{L}\p{N}-]+/gu, "-") + ".mp4"}>تنزيل الفيلم النهائي MP4</a></p></div>}
        <p className="muted">تنبيه: التصدير يتم على جهازك داخل المتصفح وليس على خادم Vercel؛ لذلك قد يستغرق وقتًا على الأجهزة القديمة، ويحتاج ذاكرة ومساحة مؤقتة كافية. المقاطع الخارجية يجب أن تسمح بتنزيلها من المتصفح (CORS). عند رفض المصدر، نزّل المقطع من مزوده ثم ارفعه إلى المشهد. التصدير الحالي يضم الصوت المضاف كمسار واحد؛ لا ينشئ تعليقًا صوتيًا تلقائيًا.</p>
      </section>
      <div className="nextPhase"><b>المرحلة التالية: تحسين الصوت والانتقالات والعناوين</b><p>التجميع الأولي يعمل محليًا داخل المتصفح، دون خادم GPU أو خدمة مدفوعة. سيتم تطوير أدوات المونتاج تدريجيًا بعد اختبار التصدير.</p></div>
    </section>}

    <section className="pipeline"><span className="eyebrow">03 / خط الإنتاج</span><h2>من السيناريو إلى الفيلم النهائي</h2><div className="steps">{[["01","السيناريو","بناء القصة والحوار"],["02","الشخصيات","مرجع بصري موحد"],["03","المشاهد","صور ولقطات متحركة"],["04","الصوت","أداء عربي وموسيقى"],["05","المونتاج","تركيب وتصدير MP4"]].map(x => <div key={x[0]}><small>{x[0]}</small><b>{x[1]}</b><span>{x[2]}</span></div>)}</div></section>
    <footer><b>استوديو الينبوع السينمائي</b><span>راجع النصوص والمراجع الدينية قبل النشر.</span></footer>
  </main>;
}
