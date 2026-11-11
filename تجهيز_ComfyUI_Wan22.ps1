$ErrorActionPreference = "Stop"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "ثبّت Git for Windows أولًا: https://git-scm.com/download/win" }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "ثبّت Python 3.11 أولًا: https://www.python.org/downloads/" }
$target = Join-Path $PSScriptRoot "local-ai\ComfyUI"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
if (-not (Test-Path $target)) { git clone https://github.com/comfyanonymous/ComfyUI.git $target } else { Write-Host "ComfyUI موجود بالفعل." }
Push-Location $target
try {
 python -m venv .venv
 & .\.venv\Scripts\python.exe -m pip install --upgrade pip
 & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
 Write-Host "تم تثبيت ComfyUI الأساسي." -ForegroundColor Green
 Write-Host "ثبّت PyTorch المطابق لبطاقة الرسوميات من https://pytorch.org/get-started/locally/"
 Write-Host "أوزان Wan 2.2 كبيرة جدًا ولن يتم تنزيلها تلقائيًا لتجنب استهلاك عشرات الجيجابايت دون موافقتك: https://huggingface.co/Wan-AI"
} finally { Pop-Location }
