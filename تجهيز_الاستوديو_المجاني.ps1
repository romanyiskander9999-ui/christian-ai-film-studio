$ErrorActionPreference = "Stop"
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "ثبّت App Installer من Microsoft Store لتوفير winget." }
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { winget install --id Ollama.Ollama -e --silent --accept-package-agreements --accept-source-agreements }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements }
$env:Path += ";C:\Program Files\nodejs;$env:LOCALAPPDATA\Programs\Ollama"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "أعد فتح PowerShell بعد تثبيت Ollama وNode.js ثم أعد تشغيل الملف." }
Write-Host "تنزيل qwen2.5:1.5b (عدة جيجابايت)..." -ForegroundColor Yellow
ollama pull qwen2.5:1.5b
if (-not (Test-Path ".env.local")) { @"
OLLAMA_API_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:1.5b
COMFYUI_API_URL=http://127.0.0.1:8188
"@ | Set-Content -Encoding UTF8 ".env.local" }
npm install
Write-Host "اكتمل تجهيز Ollama ومكتبات التطبيق. شغّل تشغيل_الاستوديو_محليًا.bat" -ForegroundColor Green
