$ErrorActionPreference = "Stop"
Write-Host "استوديو الينبوع - تجهيز الذكاء الاصطناعي المحلي" -ForegroundColor Cyan
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "ثبّت App Installer من Microsoft Store لتوفير winget ثم أعد المحاولة." }
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { winget install --id Ollama.Ollama -e --silent --accept-package-agreements --accept-source-agreements }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements }
$env:Path += ";C:\Program Files\nodejs;$env:LOCALAPPDATA\Programs\Ollama"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { throw "لم يظهر Ollama بعد التثبيت. أعد فتح PowerShell ثم أعد تشغيل هذا الملف." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "لم يظهر npm بعد التثبيت. أعد فتح PowerShell ثم أعد تشغيل هذا الملف." }
Write-Host "تنزيل نموذج qwen2.5:7b (عدة جيجابايت)..." -ForegroundColor Yellow
ollama pull qwen2.5:7b
if (-not (Test-Path ".env.local")) {
@"
OLLAMA_API_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
COMFYUI_API_URL=http://127.0.0.1:8188
"@ | Set-Content -Encoding UTF8 ".env.local"
}
npm install
Write-Host "اكتمل تجهيز Ollama ومكتبات التطبيق. شغّل تشغيل_الاستوديو_محليًا.bat" -ForegroundColor Green
