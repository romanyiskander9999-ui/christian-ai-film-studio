@echo off
chcp 65001 >nul
cd /d "%~dp0local-ai\ComfyUI"
if not exist ".venv\Scripts\python.exe" (echo شغّل تجهيز_ComfyUI_Wan22.ps1 أولًا. & pause & exit /b 1)
.venv\Scripts\python.exe main.py --listen 127.0.0.1 --port 8188
pause
