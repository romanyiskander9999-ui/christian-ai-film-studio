@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "Ollama" /min ollama serve
timeout /t 3 /nobreak >nul
npm run dev
pause
