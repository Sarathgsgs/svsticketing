@echo off
cd /d "%~dp0\..\frontend"
if not exist "node_modules" (
  echo [setup] Installing frontend dependencies...
  npm install
)
npm run dev
