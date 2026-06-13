@echo off
setlocal
cd /d "%~dp0"
start "" /min "C:\Users\owner\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8765 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8765/index.html"
