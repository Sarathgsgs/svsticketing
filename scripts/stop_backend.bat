@echo off
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo Killing PID %%p on port 8000
  taskkill /PID %%p /F >nul
  goto :eof
)
echo No process found on port 8000.
