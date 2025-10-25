@echo off
cd /d "%~dp0\.."
set PY=backend\.venv\Scripts\python.exe
set PIP=backend\.venv\Scripts\pip.exe

if not exist "%PY%" (
  echo [setup] Creating virtual environment...
  python -m venv backend\.venv
)

echo [setup] Installing backend dependencies...
"%PY%" -m pip install --upgrade pip >nul
"%PIP%" install -r backend\requirements.txt >nul

echo [run] Starting Uvicorn on http://localhost:8000 ...
"%PY%" -m uvicorn main:app --app-dir backend --reload --port 8000
