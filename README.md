# استوديو الينبوع السينمائي

## تجهيز Windows
1. نزّل المستودع ZIP وفك الضغط.
2. شغّل `تجهيز_الاستوديو_المجاني.ps1` من PowerShell:
   `powershell -ExecutionPolicy Bypass -File .\تجهيز_الاستوديو_المجاني.ps1`
3. يثبت Ollama وNode.js عبر winget، وينزّل نموذج `qwen2.5:7b` (عدة جيجابايت)، ويثبت مكتبات المشروع ويجهز `.env.local`.
4. شغّل `تشغيل_الاستوديو_محليًا.bat` وافتح http://localhost:3000.

## Wan 2.2 الاختياري
- شغّل `تجهيز_ComfyUI_Wan22.ps1` لتثبيت ComfyUI واعتماديات Python.
- ثبّت PyTorch المطابق لبطاقة الرسوميات من https://pytorch.org/get-started/locally/
- نزّل أوزان Wan 2.2 من https://huggingface.co/Wan-AI (كبيرة جدًا؛ لا تُنزّل تلقائيًا).
- شغّل `تشغيل_ComfyUI.bat`، وأنشئ Workflow متوافقًا وصدّره بصيغة API JSON.

## المتغيرات
```
OLLAMA_API_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
COMFYUI_API_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_JSON=
COMFYUI_PROMPT_NODE_ID=
COMFYUI_PROMPT_INPUT=text
```

## حدود مهمة
- Vercel لا يستطيع الوصول إلى localhost على جهازك. لتشغيل Ollama وComfyUI على جهازك يجب تشغيل نسخة التطبيق محليًا.
- لا توجد مفاتيح OpenAI أو Runway مطلوبة، ولا طلبات فيديو مدفوعة.
- تشغيل النماذج محليًا بلا رسوم API، لكنه يحتاج موارد GPU وكهرباء ومساحة تخزين.
- Dreamina وPixVerse يقدمان أرصدة مجانية وفق شروط كل حساب، وليست API مجانية مضمونة.
