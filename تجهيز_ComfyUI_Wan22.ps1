$ErrorActionPreference = "Stop"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "ثبّت Git for Windows: https://git-scm.com/download/win" }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw "ثبّت Python 3.11: https://www.python.org/downloads/" }
$target = Join-Path $PSScriptRoot "local-ai\ComfyUI"
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
if (-not (Test-Path $target)) { git clone https://github.com/comfyanonymous/ComfyUI.git $target }
Push-Location $target
try {
 python -m venv .venv
 & .\.venv\Scripts\python.exe -m pip install --upgrade pip
 & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
 Write-Host "ثبت ComfyUI الأساسي. ثبّت PyTorch المناسب من https://pytorch.org/get-started/locally/" -ForegroundColor Green
 Write-Host "أوزان Wan 2.2 كبيرة ولن تُنزّل تلقائيًا: https://huggingface.co/Wan-AI"
} finally { Pop-Location }
