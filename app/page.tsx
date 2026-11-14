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
  const [sourceImportStatus, setSourceImportStatus] = useState("");
  const [sourceImportBusy, setSourceImportBusy] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("http://127.0.0.1:11434");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:1.5b");
  const [ollamaStatus, setOllamaStatus] = useState("");
  const [ollamaBusy, setOllamaBusy] = useState(false);
  const [style, setStyle] = useState("سينمائي تاريخي واقعي");
  const [duration, setDuration] = useState("60-90 ثانية");
  const [audience, setAudience] = useState("الأسرة والأطفال");
  const [reference, setReference] = useState("الكتاب المقدس");
  const [loading, setLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [error, setError] = useState("");
  const [board, setBoard] = useState<Storyboard | null>(null);
  const [active, setActive] = useState(0);
  const [savedAt, setSavedAt] = useState("");
  const [assemblyStatus, setAssemblyStatus] = useState("");
  const [assemblyBusy, setAssemblyBusy] = useState(false);
  const [soundtrackUrl, setSoundtrackUrl] = useState("");
  const [soundtrackName, setSoundtrackName] = useState("");
  const [soundtrackVolume, setSoundtrackVolume] = useState(0.8);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandLogoName, setBrandLogoName] = useState("");
  const [copyrightText, setCopyrightText] = useState("");
  const [finalFilmUrl, setFinalFilmUrl] = useState("");
  const [speaking, setSpeaking] = useState(false);

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
    } catch {
      // لا نحذف النسخة المحفوظة تلقائيًا عند تعذر تحليلها؛ نحافظ عليها لاحتمال استعادتها يدويًا.
      setSavedAt("تعذر قراءة النسخة المحفوظة — لم تُحذف.");
      setError("تعذر قراءة بيانات المشروع المحفوظة. لم نحذف الملف المحلي حفاظًا على بياناتك؛ صدّر نسخة احتياطية إن كانت ما زالت قابلة للقراءة قبل بدء مشروع جديد.");
    }
  }, []);

  useEffect(() => {
    if (!board) return;
    const stamp = new Date().toLocaleString("ar-EG");
    const portableBoard = makePortableBoard(board);
    try {
      localStorage.setItem("alyanbo3-film-studio-project", JSON.stringify({ board: portableBoard, idea, savedAt: stamp }));
      setSavedAt(stamp);
    } catch { setSavedAt("تعذر الحفظ على هذا الجهاز"); }
  }, [board, idea]);

  async function importSourceFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const supported = ["txt", "md", "csv", "json", "pdf", "docx", "pptx"];
    if (!supported.includes(extension)) {
      setSourceImportStatus("صيغة الملف غير مدعومة. استخدم TXT أو MD أو CSV أو JSON أو PDF أو DOCX أو PPTX.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSourceImportStatus("حجم الملف أكبر من 25 ميجابايت. قسّم الملف إلى أجزاء أصغر ثم أعد المحاولة.");
      return;
    }
    setSourceImportBusy(true);
    setSourceImportStatus("جارٍ قراءة " + file.name + "...");
    setError("");
    try {
      let extracted = "";
      if (["txt", "md", "csv", "json"].includes(extension)) {
        extracted = await file.text();
      } else if (extension === "docx") {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        extracted = result.value || "";
      } else if (extension === "pptx") {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const slidePaths = Object.keys(zip.files).filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
          .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
        if (!slidePaths.length) throw new Error("لم أعثر على شرائح قابلة للقراءة داخل ملف PowerPoint.");
        const parser = new DOMParser();
        const slides: string[] = [];
        for (const path of slidePaths) {
          const xml = await zip.files[path].async("text");
          const doc = parser.parseFromString(xml, "application/xml");
          const textRuns = Array.from(doc.getElementsByTagName("a:t")).map(node => node.textContent || "").filter(Boolean);
          if (textRuns.length) slides.push(textRuns.join(" "));
        }
        extracted = slides.map((text, index) => "الشريحة " + (index + 1) + "\n" + text).join("\n\n");
      } else if (extension === "pdf") {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const pdfPage = await pdf.getPage(pageNumber);
          const content = await pdfPage.getTextContent();
          const line = content.items.map((item: any) => "str" in item ? item.str : "").filter(Boolean).join(" ");
          if (line.trim()) pages.push("صفحة " + pageNumber + "\n" + line);
        }
        extracted = pages.join("\n\n");
        if (!extracted.trim()) throw new Error("لم أستطع استخراج نص من PDF. قد يكون الملف صورًا ممسوحة ضوئيًا ويحتاج إلى OCR.");
      }
      extracted = extracted.replace(/\u0000/g, "").trim();
      if (!extracted) throw new Error("الملف لا يحتوي على نص قابل للاستخراج.");
      const clipped = extracted.length > 120000;
      const cleanText = extracted.slice(0, 120000);
      setIdea(previous => previous.trim() ? previous.trim() + "\n\n---\nالنص المستورد: " + file.name + "\n" + cleanText : cleanText);
      setSourceImportStatus("تم استخراج " + cleanText.length.toLocaleString("ar-EG") + " حرف من " + file.name + (clipped ? " (عُرض أول 120 ألف حرف فقط لحماية أداء المتصفح)." : "."));
    } catch (e) {
      setSourceImportStatus(e instanceof Error ? "تعذر استيراد الملف: " + e.message : "حدث خطأ أثناء قراءة الملف.");
    } finally {
      setSourceImportBusy(false);
    }
  }

  function speakScene(index: number) {
    if (!board || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setError("ميزة النطق غير متاحة في هذا المتصفح. جرّب Chrome أو Edge.");
      return;
    }
    window.speechSynthesis.cancel();
    const scene = board.scenes[index];
    const text = [scene.narration, scene.dialogue].filter(Boolean).join(". ").trim();
    if (!text) { setError("لا يوجد تعليق صوتي أو حوار في هذا المشهد."); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-EG";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.toLowerCase().startsWith("ar-eg")) || voices.find(voice => voice.lang.toLowerCase().startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSceneSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function exportSubtitles() {
    if (!board) return;
    const toSeconds = (value: string) => {
      const normalized = String(value || "").replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      const match = normalized.match(/[0-9]+(?:\.[0-9]+)?/);
      const parsed = match ? Number(match[0]) : 10;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
    };
    const stamp = (seconds: number) => {
      const ms = Math.max(0, Math.round(seconds * 1000));
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      const millis = ms % 1000;
      return [hours, minutes, secs].map(n => String(n).padStart(2, "0")).join(":") + "," + String(millis).padStart(3, "0");
    };
    let cursor = 0;
    const cues: string[] = [];
    for (const scene of board.scenes) {
      const text = [scene.narration, scene.dialogue].filter(Boolean).join("\n");
      const length = toSeconds(scene.duration);
      if (text.trim()) {
        cues.push(String(cues.length + 1) + "\n" + stamp(cursor) + " --> " + stamp(cursor + length) + "\n" + text.trim());
      }
      cursor += length;
    }
    if (cues.length === 0) {
      setError("لا توجد حوارات أو تعليقات صوتية في المشاهد لإنشاء ملف ترجمة.");
      return;
    }
    const blob = new Blob(["\uFEFF" + cues.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (board.title || "alyanbo3-film").replace(/[^\p{L}\p{N}-]+/gu, "-") + ".srt";
    a.click();
    URL.revokeObjectURL(url);
  }

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
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoStatus: "FAILED", videoError: e instanceof Error ? e.message : "حدث خطأ" } : s) }) : prev);
    }
  }

  // Automatically check pending cloud/local video jobs while the project is open.
  useEffect(() => {
    if (!board) return;
    const pending = board.scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => {
        const status = String(scene.cloudTaskId ? scene.cloudStatus : scene.videoStatus || "").toLowerCase();
        const taskId = scene.cloudTaskId || scene.videoTaskId;
        return !!taskId && !["completed", "success", "failed", "error", "not_found", "local_file"].includes(status);
      });
    if (pending.length === 0) return;
    const timer = window.setInterval(() => {
      pending.forEach(({ scene, index }) => {
        if (scene.cloudTaskId) void refreshCloudVideo(index);
        else if (scene.videoTaskId) void refreshLocalVideo(index);
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [board]);

  function attachSceneVideo(index: number, file: File) {
    if (!file.type.startsWith("video/")) {
      setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoError: "اختر ملف فيديو صالحًا." } : s) }) : prev);
      return;
    }
    const url = URL.createObjectURL(file);
    setBoard(prev => prev ? ({ ...prev, scenes: prev.scenes.map((s, i) => i === index ? { ...s, videoUrl: url, videoFileName: file.name, videoStatus: "LOCAL_FILE", videoError: "" } : s) }) : prev);
  }

  function updateSceneField(index: number, field: "title" | "duration" | "visual" | "camera" | "dialogue" | "narration", value: string) {
    setBoard(previous => previous ? ({
      ...previous,
      scenes: previous.scenes.map((scene, sceneIndex) => sceneIndex === index ? { ...scene, [field]: value } : scene)
    }) : previous);
    setFinalFilmUrl("");
  }

  function copyScenePrompt(index: number) {
    if (!board) return;
    const scene = board.scenes[index];
    const prompt = [scene.videoPrompt || scene.prompt || scene.visual, scene.negativePrompt ? "Negative prompt: " + scene.negativePrompt : ""].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(prompt);
  }

  async function createBrandOverlay(): Promise<Blob | null> {
    if (!brandLogoUrl && !copyrightText.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = 854;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر إنشاء طبقة الهوية البصرية على هذا المتصفح.");
    if (brandLogoUrl) {
      const logo = new Image();
      logo.src = brandLogoUrl;
      await logo.decode();
      const scale = Math.min(112 / logo.width, 76 / logo.height, 1);
      const width = Math.max(1, Math.round(logo.width * scale));
      const height = Math.max(1, Math.round(logo.height * scale));
      ctx.fillStyle = "rgba(10,16,24,0.62)";
      ctx.fillRect(854 - width - 28, 18, width + 16, height + 16);
      ctx.drawImage(logo, 854 - width - 20, 26, width, height);
    }
    if (copyrightText.trim()) {
      ctx.fillStyle = "rgba(5,9,14,0.66)";
      ctx.fillRect(0, 438, 854, 42);
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px Cairo, Arial, sans-serif";
      ctx.fillText(copyrightText.trim().slice(0, 100), 832, 459, 810);
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("تعذر تجهيز طبقة الشعار وحقوق الملكية.")), "image/png"));
  }

  function attachBrandLogo(file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setAssemblyStatus("الشعار يجب أن يكون PNG أو JPG. يفضّل PNG بخلفية شفافة.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAssemblyStatus("حجم الشعار أكبر من 8 ميجابايت.");
      return;
    }
    if (brandLogoUrl) URL.revokeObjectURL(brandLogoUrl);
    setBrandLogoUrl(URL.createObjectURL(file));
    setBrandLogoName(file.name);
    setFinalFilmUrl("");
    setAssemblyStatus("تم اختيار الشعار. سيظهر أعلى يمين الفيديو النهائي.");
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
      const brandOverlay = await createBrandOverlay();
      if (brandOverlay) await ffmpeg.writeFile("brand-overlay.png", await fetchFile(brandOverlay));
      const names: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        setAssemblyStatus("جارٍ تجهيز المشهد " + (i + 1) + " من " + clips.length + "...");
        const inputName = "input_" + i + ".bin";
        const outputName = "scene_" + i + ".mp4";
        const clipResponse = await fetch(clips[i].scene.videoUrl!, { mode: "cors" });
        if (!clipResponse.ok) throw new Error("تعذر تنزيل فيديو المشهد " + (clips[i].index + 1) + ". ارفع المقطع من جهازك ثم أعد المحاولة.");
        const clipBlob = await clipResponse.blob();
        await ffmpeg.writeFile(inputName, await fetchFile(clipBlob));
        const videoArgs = brandOverlay
          ? ["-i", inputName, "-i", "brand-overlay.png", "-filter_complex", "[0:v]scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,fps=24[base];[base][1:v]overlay=0:0:format=auto,format=yuv420p[outv]", "-map", "[outv]"]
          : ["-i", inputName, "-map", "0:v:0", "-vf", "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p"];
        const result = await ffmpeg.exec([...videoArgs, "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-movflags", "+faststart", outputName]);
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
        const result = await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-stream_loop", "-1", "-i", "soundtrack.bin", "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-af", `volume=${soundtrackVolume},afade=t=in:st=0:d=1`, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", output]);
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

  function makePortableBoard(source: Storyboard): Storyboard {
    return {
      ...source,
      scenes: source.scenes.map(scene => scene.videoUrl?.startsWith("blob:")
        ? { ...scene, videoUrl: undefined, videoStatus: "NEEDS_REUPLOAD" }
        : scene)
    };
  }

  function exportProjectJson() {
    if (!board) return;
    const project = {
      format: "alyanbo3-film-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      idea,
      board: makePortableBoard(board)
    };
    const blob = new Blob(["\\uFEFF" + JSON.stringify(project, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (board.title || "alyanbo3-film-project").replace(/[^\\p{L}\\p{N}-]+/gu, "-") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importProjectJson(file: File) {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw.replace(/^\\uFEFF/, ""));
      const importedBoard = parsed?.board || parsed;
      if (!importedBoard?.title || !Array.isArray(importedBoard.scenes) || importedBoard.scenes.length === 0) {
        throw new Error("الملف لا يحتوي على مشروع صالح أو قائمة مشاهد.");
      }
      setBoard(makePortableBoard(importedBoard));
      setIdea(typeof parsed.idea === "string" ? parsed.idea : "");
      setActive(0);
      setError("");
      setFinalFilmUrl("");
      setAssemblyStatus("تم استيراد المشروع. ستُحفظ بياناته تلقائيًا على هذا الجهاز.");
      setSavedAt("تم الاستيراد للتو");
    } catch (e) {
      setError(e instanceof Error ? "تعذر استيراد المشروع: " + e.message : "تعذر قراءة ملف المشروع.");
    }
  }

  function clearSavedProject() {
    if (!confirm("هل تريد حذف المشروع المحفوظ من هذا الجهاز؟")) return;
    localStorage.removeItem("alyanbo3-film-studio-project"); setBoard(null); setIdea(""); setSavedAt("");
  }

  function startNewProject() {
    if (!confirm("ابدأ مشروعًا جديدًا؟ سيُستبدل المشروع المحفوظ في هذا المتصفح. نزّل نسخة JSON من المشروع الحالي أولًا إذا أردت الاحتفاظ به.")) return;
    localStorage.removeItem("alyanbo3-film-studio-project");
    stopSceneSpeech();
    if (finalFilmUrl) URL.revokeObjectURL(finalFilmUrl);
    if (soundtrackUrl) URL.revokeObjectURL(soundtrackUrl);
    setBoard(null); setIdea(""); setSavedAt(""); setActive(0); setFinalFilmUrl("");
    setSoundtrackUrl(""); setSoundtrackName(""); setAssemblyStatus(""); setError(""); setGenerationStatus("");
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

  function generateOfflineDraft() {
    if (idea.trim().length < 12) { setError("اكتب فكرة القصة بتفاصيل أكثر أولًا."); return; }
    const scenePlan: Record<string, { count: number; length: string }> = {
      "60-90 ثانية": { count: 3, length: "20-30 ثانية" },
      "2-3 دقائق": { count: 4, length: "30-45 ثانية" },
      "3-5 دقائق": { count: 6, length: "30-50 ثانية" },
      "5-10 دقائق": { count: 8, length: "40-75 ثانية" },
      "10-20 دقيقة": { count: 12, length: "50-100 ثانية" }
    };
    const plan = scenePlan[duration] || scenePlan["60-90 ثانية"];
    const beats = [
      ["المقدمة والتعريف", "تقديم الزمان والمكان والشخصيات، وتهيئة المشاهد لفهم خلفية القصة."],
      ["بداية الحدث", "يظهر الحدث المحرك للقصة، وتبدأ الشخصيات في مواجهة الموقف الأساسي."],
      ["تصاعد الصراع", "تتطور الأحداث وتظهر العقبات والاختيارات التي تواجه الشخصيات."],
      ["لحظة التحول", "تصل القصة إلى لحظة حاسمة تكشف حقيقة الشخصيات ومعنى ما يحدث."],
      ["الحل والنتيجة", "تبدأ الأزمة في الانفراج، وتظهر نتائج القرارات والأفعال."],
      ["الخاتمة والرسالة", "تنتهي القصة بصورة مؤثرة ورسالة واضحة يمكن للمشاهد تذكرها."]
    ];
    const scenes: Scene[] = Array.from({ length: plan.count }, (_, index) => {
      const beat = beats[Math.min(beats.length - 1, Math.floor(index * beats.length / plan.count))];
      return {
        number: index + 1, title: beat[0], duration: plan.length,
        visual: beat[1] + " اعتمد على تفاصيل النص الذي أدخله المستخدم: " + idea.trim().slice(0, 260),
        camera: index === 0 ? "لقطة تأسيسية واسعة ثم اقتراب تدريجي." : index === plan.count - 1 ? "اقتراب هادئ ثم تثبيت اللقطة الختامية." : "حركة كاميرا سينمائية بطيئة مع التركيز على تعبيرات الشخصيات.",
        dialogue: "", narration: beat[1],
        prompt: "Cinematic " + style + ", " + beat[0] + ", historically respectful, expressive characters, natural lighting",
        imagePrompt: "Cinematic " + style + ", " + beat[0] + ", " + idea.trim().slice(0, 180) + ", detailed composition, natural lighting, no text",
        videoPrompt: "Slow cinematic camera movement, subtle character motion, consistent character appearance, natural lighting",
        negativePrompt: "text, logos, watermark, distorted anatomy",
        audioDesign: "موسيقى خلفية هادئة ومؤثرات صوتية مناسبة للمشهد."
      };
    });
    const title = idea.trim().split(/[.!؟\n]/)[0].slice(0, 65) || "فيلم الينبوع";
    setBoard({
      title, logline: "مسودة أولية مبنية على الفكرة المدخلة، قابلة للتحرير والتطوير.",
      synopsis: idea.trim().slice(0, 900),
      visualBible: { world: style, palette: "ألوان متناسقة وإضاءة طبيعية تخدم الحالة الدرامية.", continuity: "حافظ على ثبات ملامح الشخصيات والملابس والمواقع بين المشاهد.", styleGuide: style },
      characters: [], scenes,
      accuracyNotes: ["هذه مسودة محلية أولية أُنشئت دون اتصال بنموذج ذكاء اصطناعي. راجع الوقائع والمراجع والحوار قبل الإنتاج."]
    });
    setActive(0); setFinalFilmUrl(""); setError("");
    setGenerationStatus("تم إنشاء مسودة محلية قابلة للتحرير دون الحاجة إلى Ollama أو اتصال خارجي.");
  }

  async function generate() {
    if (idea.trim().length < 12) { setError("اكتب فكرة القصة بتفاصيل أكثر أولًا."); return; }
    setLoading(true); setError(""); setActive(0);
    const existingBoard = board;
    const base = (ollamaUrl.trim().endsWith("/") ? ollamaUrl.trim().slice(0, -1) : ollamaUrl.trim());
    const model = ollamaModel.trim() || "qwen2.5:1.5b";
    const scenePlan: Record<string, { count: number; length: string }> = {
      "60-90 ثانية": { count: 3, length: "20-30 ثانية" },
      "2-3 دقائق": { count: 4, length: "30-45 ثانية" },
      "3-5 دقائق": { count: 6, length: "30-50 ثانية" },
      "5-10 دقائق": { count: 8, length: "40-75 ثانية" },
      "10-20 دقيقة": { count: 12, length: "50-100 ثانية" }
    };
    const { count, length: sceneDuration } = scenePlan[duration] || scenePlan["60-90 ثانية"];

    // كل طلب صغير ومستقل؛ نحفظ النتيجة بعد كل مرحلة حتى لا نفقد العمل كله.
    async function askJson(system: string, user: string, tokenLimit: number, stage: string) {
      const response = await fetch(base + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model, stream: true, format: "json",
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          options: { temperature: 0.2, num_ctx: 768, num_predict: tokenLimit, num_batch: 8 },
          keep_alive: "15m"
        }),
        signal: AbortSignal.timeout(600000),
        cache: "no-store"
      });
      if (!response.ok) {
        let detail = "";
        try { const payload = await response.json(); detail = payload.error || payload.message || ""; } catch {}
        if (response.status === 404 && /model/i.test(detail)) {
          throw new Error("النموذج غير مثبت: " + detail + " — نفّذ في PowerShell: ollama pull " + model);
        }
        throw new Error("تعذر " + stage + " (" + response.status + "): " + (detail || "تحقق من Ollama."));
      }
      if (!response.body) throw new Error("المتصفح لا يستطيع قراءة استجابة Ollama.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", output = "", streamError = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.error) streamError = String(chunk.error);
            if (typeof chunk.message?.content === "string") output += chunk.message.content;
          } catch {}
        }
        setGenerationStatus(stage + " — " + output.length.toLocaleString("ar-EG") + " حرف");
      }
      buffer += decoder.decode();
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer);
          if (chunk.error) streamError = String(chunk.error);
          if (typeof chunk.message?.content === "string") output += chunk.message.content;
        } catch {}
      }
      if (streamError) throw new Error("خطأ Ollama: " + streamError);
      if (!output.trim()) throw new Error("لم يُرجع النموذج نتيجة في مرحلة: " + stage);
      const parseObject = (value: string) => {
        try { return JSON.parse(value); } catch {}
        const start = value.indexOf("{");
        const end = value.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try { return JSON.parse(value.slice(start, end + 1)); } catch {}
        }
        return null;
      };
      const parsed = parseObject(output);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;

      // إصلاح تلقائي قصير لكل مرحلة، وبالأخص المشاهد التي قد تنقطع عند حد الرموز.
      const isScene = stage.startsWith("كتابة المشهد");
      const repairSystem = isScene
        ? "أنت تصلح JSON. أخرج كائنًا صالحًا ومكتملًا بهذه المفاتيح الستة فقط: number,title,visual,narration,imagePrompt,videoPrompt. اجعل القيم قصيرة جدًا، وimagePrompt وvideoPrompt جملة إنجليزية قصيرة. لا تضف شرحًا."
        : "أخرج JSON صالحًا ومكتملًا فقط بالمفاتيح title,logline,synopsis,characters. characters عنصران كحد أقصى وكل عنصر name وdescription. اختصر بشدة.";
      const repairUser = isScene
        ? "أعد بناء مشهد مكتمل اعتمادًا على الطلب والجزء غير المكتمل. الطلب: " + user.slice(0, 1100) + "\nالجزء الناتج: " + output.slice(0, 1400)
        : "أنشئ ملخصًا جديدًا مكتملًا وقصيرًا لهذه الفكرة: " + idea.slice(0, 500);
      try {
        setGenerationStatus(stage + " — إصلاح تلقائي للاستجابة غير المكتملة...");
        const repaired = await fetch(base + "/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model, stream: false, format: "json",
            messages: [{ role: "system", content: repairSystem }, { role: "user", content: repairUser }],
            options: { temperature: 0.1, num_ctx: 1024, num_predict: isScene ? 180 : 220, num_batch: 8 },
            keep_alive: "15m"
          }),
          signal: AbortSignal.timeout(240000), cache: "no-store"
        });
        if (repaired.ok) {
          const payload = await repaired.json();
          const content = payload.message?.content;
          if (typeof content === "string") {
            const fixed = parseObject(content);
            if (fixed && typeof fixed === "object" && !Array.isArray(fixed)) return fixed;
          }
        }
      } catch {}
      throw new Error("تعذر إكمال JSON في مرحلة: " + stage + ". أُبقيت المراحل المكتملة كما هي؛ اضغط إنشاء السيناريو مرة أخرى لاستكمال المشهد الناقص.");
    }

    try {
      let initial: Storyboard;
      if (existingBoard) {
        initial = existingBoard;
        setGenerationStatus("استكمال المشروع المحفوظ: تم إنجاز " + initial.scenes.length + " من " + count + " مشاهد...");
      } else {
        setGenerationStatus("المرحلة 1 من 4: إعداد عنوان الفيلم وملخصه...");
        const meta = await askJson(
          "أنت كاتب سيناريو. أخرج JSON صالحًا فقط بهذه المفاتيح الأربعة: title نص قصير، logline جملة واحدة، synopsis جملتان فقط، characters مصفوفة من عنصرين كحد أقصى وكل عنصر يحتوي name وdescription فقط. لا تضف visualPrompt ولا أي مفاتيح أخرى. اجعل كل القيم قصيرة جدًا وأغلق الأقواس وعلامات الاقتباس.",
          "الفكرة: " + idea.slice(0, 900) + "\nالطابع: " + style + "\nالجمهور: " + audience + "\nالمرجع: " + reference + "\nأعد JSON صغيرًا مكتملًا فقط.",
          320, "إعداد ملخص الفيلم"
        );
        initial = {
          title: String(meta.title || "فيلم الينبوع"),
          logline: String(meta.logline || ""),
          synopsis: String(meta.synopsis || ""),
          visualBible: { world: style, palette: "", continuity: "حافظ على ثبات ملامح الشخصيات بين المشاهد.", styleGuide: style },
          characters: Array.isArray(meta.characters) ? meta.characters.slice(0, 3) : [],
          scenes: [], accuracyNotes: ["راجع النص والمراجع الكتابية قبل اعتماد السيناريو النهائي."]
        };
        setBoard(initial);
      }
      if (initial.scenes.length >= count) {
        setGenerationStatus("المشاهد المطلوبة مكتملة بالفعل. يمكنك مراجعة السيناريو.");
        return;
      }
      for (let i = initial.scenes.length; i < count; i++) {
        setGenerationStatus("المرحلة " + (i + 2) + " من " + (count + 1) + ": كتابة المشهد " + (i + 1) + " من " + count + "...");
        let scene: Record<string, unknown>;
        try {
          scene = await askJson(
            "أخرج JSON فقط بستة مفاتيح: number,title,visual,narration,imagePrompt,videoPrompt. اكتب جملًا قصيرة جدًا. imagePrompt وvideoPrompt بالإنجليزية. لا تضف شرحًا.",
            "القصة: " + idea.slice(0, 450) + "\nالعنوان: " + initial.title + "\nملخص: " + initial.synopsis.slice(0, 180) + "\nالمشهد " + (i + 1) + " من " + count + ". المدة المستهدفة لهذا المشهد: " + sceneDuration + ". " + (i === 0 ? "قدّم المكان والشخصيات." : i === count - 1 ? "اكتب خاتمة واضحة." : "طوّر الحدث.") + " أعد ستة حقول قصيرة فقط.",
            220, "كتابة المشهد " + (i + 1)
          );
        } catch (sceneError) {
          // لا ننشئ مسودة بديلة إلا عند فشل تنسيق JSON؛ أخطاء الاتصال والنموذج والمهلة يجب أن تظهر للمستخدم.
          const sceneMessage = sceneError instanceof Error ? sceneError.message : String(sceneError);
          if (!sceneMessage.startsWith("تعذر إكمال JSON في مرحلة:")) throw sceneError;
          const isEnding = i === count - 1;
          const cast = initial.characters.slice(0, 2).map(c => c.name).filter(Boolean).join(" و");
          const castText = cast || "الشخصيات الرئيسية";
          scene = {
            number: i + 1,
            title: isEnding ? "الخاتمة وبداية الرجاء" : "تطور الأحداث",
            visual: isEnding
              ? "تظهر الشخصيات وقد تجاوزت الأزمة، في مشهد هادئ يعكس معنى القصة."
              : "تتفاعل الشخصيات مع الحدث الرئيسي في مكان القصة، مع إظهار مشاعرها بوضوح.",
            narration: isEnding
              ? "تنتهي الأحداث برسالة القصة: المحبة والرجاء يصنعان بداية جديدة."
              : "يتقدم الحدث وتواجه الشخصيات نتيجة اختياراتها، لتتضح الرسالة الإنسانية والروحية للقصة.",
            imagePrompt: "Cinematic biblical drama, expressive characters, historically respectful setting, natural warm light, realistic film still",
            videoPrompt: "Slow cinematic camera movement, subtle character motion, natural lighting, realistic historical drama",
          };
          setGenerationStatus("تعذر توليد المشهد " + (i + 1) + " آليًا؛ أُنشئت مسودة بديلة لـ " + castText + " ويمكنك تعديلها، وسيستمر الفيلم.");
        }
        const normalized: Scene = {
          number: i + 1, title: String(scene.title || "المشهد " + (i + 1)),
          duration: String(scene.duration || sceneDuration),
          visual: String(scene.visual || ""), camera: String(scene.camera || ""),
          dialogue: String(scene.dialogue || ""), narration: String(scene.narration || ""),
          prompt: String(scene.imagePrompt || scene.videoPrompt || ""),
          imagePrompt: String(scene.imagePrompt || ""), videoPrompt: String(scene.videoPrompt || ""),
          negativePrompt: String(scene.negativePrompt || "text, logos, watermark, distorted anatomy"),
          audioDesign: String(scene.audioDesign || "")
        };
        setBoard(prev => prev ? ({ ...prev, scenes: [...prev.scenes, normalized] }) : prev);
      }
      setGenerationStatus("اكتمل السيناريو وحُفظت جميع المشاهد.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "حدث خطأ غير متوقع.";
      setError(message.includes("timed out") || message.includes("Timeout") || message.includes("timeout")
        ? "توقف النموذج بسبب بطء الاستجابة. تم الاحتفاظ بكل مرحلة اكتملت. جرّب إعادة المحاولة بعد إغلاق البرامج الأخرى."
        : message + (board ? " تم الاحتفاظ بالأجزاء التي اكتملت." : ""));
    } finally { setLoading(false); }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="crossMark">✝</span><div><b>استوديو الينبوع للإنتاج السينمائي</b><small>ALYANBOA CINEMATIC STUDIO</small></div></div>
      <span className="version">نسخة العمل المتاحة · V1</span>
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
      <div className="sourceImport">
        <label className="field">استيراد نص من ملف
          <span className="sourceImportHint">PDF · Word · PowerPoint · TXT · Markdown · CSV · JSON</span>
          <input type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.pptx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" disabled={sourceImportBusy} onChange={e => { const file = e.currentTarget.files?.[0]; if (file) void importSourceFile(file); e.currentTarget.value = ""; }} />
        </label>
        <p className="muted">يُستخرج النص داخل متصفحك ويُضاف إلى مربع القصة. الحد الأقصى 25 ميجابايت للملف و120 ألف حرف للنص المستورد. ملفات PDF المصورة تحتاج إلى OCR خارجي.</p>
        {sourceImportStatus && <p className="sourceImportStatus" role="status" aria-live="polite">{sourceImportBusy ? "⏳ " : "✓ "}{sourceImportStatus}</p>}
      </div>
      <div className="samples"><span>جرّب مثالًا:</span>{samples.map(([label, value]) => <button key={label} onClick={() => setIdea(value)}>{label}</button>)}</div>
      <div className="grid">
        <label className="field">الطابع البصري<select value={style} onChange={e => setStyle(e.target.value)}><option>سينمائي تاريخي واقعي</option><option>رسوم متحركة ثلاثية الأبعاد</option><option>دراما تاريخية ملحمية</option><option>وثائقي هادئ</option><option>سينمائي مناسب للأطفال</option></select></label>
        <label className="field">مدة الفيلم<select value={duration} onChange={e => setDuration(e.target.value)}><option>60-90 ثانية</option><option>2-3 دقائق</option><option>3-5 دقائق</option><option>5-10 دقائق</option><option>10-20 دقيقة</option></select></label>
        <label className="field">الجمهور المستهدف<select value={audience} onChange={e => setAudience(e.target.value)}><option>الأسرة والأطفال</option><option>الشباب</option><option>جميع الأعمار</option><option>المهتمون بالدراسات الكتابية</option></select></label>
        <label className="field">المرجع الأساسي<select value={reference} onChange={e => setReference(e.target.value)}><option>الكتاب المقدس</option><option>سير القديسين والتراث القبطي</option><option>قصة تعليمية مستوحاة من القيم المسيحية</option><option>نص أقدمه بنفسي مع مراجع</option></select></label>
      </div>
      <div className="localModel" style={{ marginTop: 18 }}>
        <b>محرك الذكاء الاصطناعي المحلي — Ollama (اختياري)</b>
        <p>هذا الاتصال اختياري ويعمل فقط إذا كان Ollama مثبتًا ويعمل على نفس الجهاز الذي يفتح الموقع. عند فتح الموقع من الهاتف أو من Vercel، فإن 127.0.0.1 يشير إلى الهاتف/جهاز الزائر وليس إلى خادم الموقع. يمكنك استخدام المسودة المحلية دون تثبيت Ollama.</p>
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
      <div className="actions"><p>يمكنك إنشاء السيناريو عبر Ollama عند توفره، أو إنشاء مسودة محلية قابلة للتحرير دون اتصال.</p><div className="videoActions"><button className="primary" onClick={generate} disabled={loading}>{loading ? "جارٍ إعداد السيناريو..." : "✦ إنشاء بالذكاء الاصطناعي ←"}</button><button type="button" className="secondary" onClick={generateOfflineDraft} disabled={loading}>إنشاء مسودة دون اتصال</button></div></div>
      {loading && <div className="summary" role="status" aria-live="polite" style={{ marginTop: 14 }}><b>حالة إنشاء السيناريو</b><p>{generationStatus || "جارٍ العمل..."}</p><p className="muted">اترك Ollama يعمل والصفحة مفتوحة. عدد المشاهد ومدتها يتغيران تلقائيًا حسب المدة التي اخترتها للفيلم.</p></div>}
      {error && <div className="error">{error}</div>}
    </section>

    {board && <section className="panel results">
      <div className="sectionTitle"><div><span className="eyebrow">02 / مخرجات الذكاء الاصطناعي</span><h2>{board.title}</h2><p className="muted">{board.logline}</p><p className="muted">حفظ تلقائي على هذا الجهاز: {savedAt || "جارٍ الحفظ"}</p></div><div className="resultActions"><button className="secondary" onClick={startNewProject}>مشروع جديد</button><button className="secondary" onClick={exportScript}>تنزيل السيناريو TXT</button><button className="secondary" onClick={exportSubtitles}>تنزيل الترجمة SRT</button><button className="secondary" onClick={exportProjectJson}>تصدير المشروع كاملًا JSON</button><label className="secondary uploadVideo">استيراد مشروع JSON<input type="file" accept=".json,application/json" onChange={e => { const file = e.target.files?.[0]; if (file) void importProjectJson(file); e.currentTarget.value = ""; }} /></label><button className="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(board, null, 2))}>نسخ البيانات JSON</button><button className="secondary dangerButton" onClick={clearSavedProject}>حذف المشروع المحفوظ</button></div></div>
      <div className="summary"><b>ملخص الفيلم</b><p>{board.synopsis}</p></div>
      {board.visualBible && <div className="summary"><b>الدليل البصري الموحد للفيلم</b><p><strong>العالم والحقبة:</strong> {board.visualBible.world}</p><p><strong>الألوان والإضاءة:</strong> {board.visualBible.palette}</p><p><strong>قواعد الاستمرارية:</strong> {board.visualBible.continuity}</p><p><strong>التوجيه الفني:</strong> {board.visualBible.styleGuide}</p></div>}<h3>الشخصيات وثبات ملامحها</h3><div className="characters">{board.characters?.map((c, i) => <article key={i}><b>{c.name}</b><p>{c.description}</p>{c.visualPrompt && <div className="prompt">{c.visualPrompt}</div>}</article>)}</div>
      <div className="sceneLayout"><aside className="sceneList"><h3>المشاهد ({board.scenes?.length || 0})</h3>{board.scenes?.map((s, i) => <button className={active === i ? "sceneTab selected" : "sceneTab"} key={i} onClick={() => setActive(i)}><small>مشهد {String(i + 1).padStart(2, "0")}</small><b>{s.title}</b><small>{s.duration}</small></button>)}</aside>
        {board.scenes?.[active] && <article className="sceneDetail"><span className="eyebrow">SCENE {String(active + 1).padStart(2, "0")} · محرر المشهد</span>
          <div className="sceneEditGrid">
            <label className="field">عنوان المشهد<input value={board.scenes[active].title} onChange={e => updateSceneField(active, "title", e.target.value)} /></label>
            <label className="field">المدة التقديرية<input value={board.scenes[active].duration} onChange={e => updateSceneField(active, "duration", e.target.value)} placeholder="مثال: 20 ثانية" /></label>
            <label className="field">الوصف البصري<textarea rows={3} value={board.scenes[active].visual} onChange={e => updateSceneField(active, "visual", e.target.value)} /></label>
            <label className="field">حركة الكاميرا<textarea rows={2} value={board.scenes[active].camera} onChange={e => updateSceneField(active, "camera", e.target.value)} /></label>
            <label className="field">الحوار<textarea rows={3} value={board.scenes[active].dialogue} onChange={e => updateSceneField(active, "dialogue", e.target.value)} placeholder="اكتب الحوار أو اتركه فارغًا." /></label>
            <label className="field">التعليق الصوتي<textarea rows={3} value={board.scenes[active].narration} onChange={e => updateSceneField(active, "narration", e.target.value)} placeholder="اكتب نص الراوي لهذا المشهد." /></label>
          </div><div className="videoActions"><button type="button" className="secondary" onClick={() => speakScene(active)}>🔊 استمع للتعليق والحوار بالعربية</button><button type="button" className="secondary" onClick={stopSceneSpeech} disabled={!speaking}>إيقاف الصوت</button></div><p className="muted">النطق مجاني من أصوات العربية المثبتة في المتصفح. جودة الصوت وتوفر اللهجة يعتمدان على جهازك؛ هذه معاينة صوتية وليست ملف MP3 قابلًا للتنزيل.</p><h4>وصف الصورة المرجعية</h4><div className="prompt">{board.scenes[active].imagePrompt || board.scenes[active].prompt}</div><button className="secondary" onClick={() => navigator.clipboard.writeText(board.scenes[active].imagePrompt || board.scenes[active].prompt)}>نسخ وصف الصورة</button>
          <h4>وصف حركة الفيديو</h4><div className="prompt">{board.scenes[active].videoPrompt || board.scenes[active].prompt}</div><button className="secondary" onClick={() => navigator.clipboard.writeText(board.scenes[active].videoPrompt || board.scenes[active].prompt)}>نسخ وصف الفيديو</button>
          <h4>الأصوات والمؤثرات</h4><p>{board.scenes[active].audioDesign || "لم تحدد مؤثرات صوتية."}</p><h4>العناصر المستبعدة</h4><div className="prompt">{board.scenes[active].negativePrompt || "لا توجد."}</div>
          <div className="videoMaker"><b>توليد الفيديو السحابي — Wan 2.2</b>
          <p>يمكنك إرسال وصف المشهد مباشرة من هذا الزر إلى محرك Wan 2.2 على Hugging Face ومتابعة حالة المهمة من الاستوديو. الخدمة المجانية محدودة بحصة يومية وطابور انتظار، وقد تتوقف المساحة العامة مؤقتًا.</p>
          <p className="muted">ينشئ Wan 2.2 مقطعًا متحركًا حقيقيًا قصيرًا (حتى 5 ثوانٍ بحسب المساحة الحالية) لكل مشهد. يتابع الاستوديو المهمة تلقائيًا كل 15 ثانية ما دامت الصفحة مفتوحة؛ لا تغلق الصفحة أثناء الانتظار. بعد اكتمال المقطع سيظهر مشغل الفيديو ويمكن ضمه إلى الفيلم النهائي MP4.</p>
          {board.scenes[active].cloudTaskId && <p className="muted" role="status">حالة توليد الفيديو: <strong>{board.scenes[active].cloudStatus || "قيد الإرسال"}</strong>{board.scenes[active].videoUrl ? " — وصل ملف الفيديو ويمكن تشغيله." : " — انتظر اكتمال المعالجة."}</p>}
          <div className="videoActions"><button className="primary" onClick={() => generateCloudVideo(active)} disabled={["SUBMITTING", "QUEUED", "RUNNING", "IN_PROGRESS"].includes(String(board.scenes[active].cloudStatus || "").toUpperCase())}>{board.scenes[active].cloudStatus === "SUBMITTING" ? "جارٍ إرسال المهمة..." : ["QUEUED", "RUNNING", "IN_PROGRESS"].includes(String(board.scenes[active].cloudStatus || "").toUpperCase()) ? "الفيديو قيد التوليد..." : "✦ إنتاج الفيديو مباشرة مجانًا"}</button><button className="secondary" onClick={() => copyScenePrompt(active)}>نسخ وصف المشهد للفيديو</button>{board.scenes[active].cloudTaskId && <button className="secondary" onClick={() => refreshCloudVideo(active)}>تحديث حالة التوليد ({board.scenes[active].cloudStatus || "قيد الانتظار"})</button>}<a className="secondary" href="https://huggingface.co/spaces/mastaP/wan22-remix-sfw-t2v" target="_blank" rel="noreferrer">فتح محرك Wan 2.2 في نافذة مستقلة ↗</a></div>
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
          {board.scenes[active].videoFileName && <p className="muted">{board.scenes[active].videoUrl ? "المقطع المرفوع: " + board.scenes[active].videoFileName + " — متاح في جلسة المتصفح الحالية." : "كان هذا المشهد يستخدم الملف: " + board.scenes[active].videoFileName + ". أعد رفع الفيديو بعد استيراد المشروع؛ ملفات الفيديو لا تُضمَّن داخل ملف JSON."}</p>}
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
        <div className="brandExport">
          <b>الهوية البصرية وحقوق الملكية</b>
          <p className="muted">أضف شعارك وعبارة الحقوق لتظهر مدمجة داخل كل مشهد في الفيديو النهائي.</p>
          <label className="secondary uploadVideo" style={{ display: "inline-flex", margin: "8px 0" }}>رفع شعار PNG أو JPG<input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={e => { const file = e.currentTarget.files?.[0]; if (file) attachBrandLogo(file); e.currentTarget.value = ""; }} /></label>
          {brandLogoName && <div className="brandPreview"><img src={brandLogoUrl} alt="معاينة شعار الاستوديو" /><span>{brandLogoName}</span><button type="button" className="secondary" onClick={() => { if (brandLogoUrl) URL.revokeObjectURL(brandLogoUrl); setBrandLogoUrl(""); setBrandLogoName(""); setFinalFilmUrl(""); }}>إزالة الشعار</button></div>}
          <label className="field">عبارة حقوق الملكية / العلامة المائية<input value={copyrightText} onChange={e => { setCopyrightText(e.target.value); setFinalFilmUrl(""); }} maxLength={100} placeholder="© الينبوع للإنتاج السينمائي — جميع الحقوق محفوظة" /></label>
        </div>
        <label className="secondary uploadVideo" style={{ display: "inline-flex", margin: "8px 0" }}>إضافة تعليق صوتي أو موسيقى<input type="file" accept="audio/*" onChange={e => { const file = e.target.files?.[0]; if (file) attachSoundtrack(file); e.currentTarget.value = ""; }} /></label>
        {soundtrackName && <div className="summary"><p>الملف الصوتي المختار: {soundtrackName}</p><label className="field" style={{ maxWidth: 420 }}>مستوى صوت الموسيقى أو التعليق: {Math.round(soundtrackVolume * 100)}%<input type="range" min="0" max="1" step="0.05" value={soundtrackVolume} onChange={e => setSoundtrackVolume(Number(e.target.value))} /></label><button type="button" className="secondary" onClick={() => { if (soundtrackUrl) URL.revokeObjectURL(soundtrackUrl); setSoundtrackUrl(""); setSoundtrackName(""); setFinalFilmUrl(""); }}>إزالة الملف الصوتي</button></div>}
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
