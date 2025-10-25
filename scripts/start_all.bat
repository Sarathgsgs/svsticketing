@echo off
cd /d "%~dp0\.."
start "Backend" cmd /k scripts\start_backend.bat
start "Frontend" cmd /k "cd /d frontend && npm run dev"
