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


## توليد الفيديو السحابي من داخل الموقع
- أُضيفت مساحة عامة لتجربة Wan 2.2 Remix SFW على Hugging Face داخل لوحة كل مشهد: https://huggingface.co/spaces/mastaP/wan22-remix-sfw-t2v
- انسخ وصف المشهد من الاستوديو ثم الصقه في واجهة المساحة المضمّنة، وابدأ التوليد من هناك.
- هذه تجربة مجانية عبر ZeroGPU بحصة محدودة وانتظار محتمل؛ توضح وثائق Hugging Face أن الحساب المجاني لديه 5 دقائق GPU يوميًا، وقد تتغير الإتاحة والقيود.
- المساحة العامة ليست جزءًا من خادم Vercel ولا نتحكم في استمرارها أو طوابيرها. لا يتم تشغيل أي خدمة مدفوعة تلقائيًا.
- مرجع الحصة وواجهة API: https://huggingface.co/docs/hub/spaces-zerogpu و https://huggingface.co/docs/hub/spaces-api-endpoints
