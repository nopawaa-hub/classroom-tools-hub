@echo off
REM ============================================================
REM  Classroom Tools Hub - one-click launcher
REM  Double-click this file to start the dashboard.
REM  A browser tab opens automatically. Close this window to
REM  stop the server when you're done.
REM ============================================================

title Classroom Tools Hub - Server (close to stop)

REM --- Pick the first available port starting from 8000 ---
set PORT=8000
:findport
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  set /a PORT+=1
  if %PORT% GTR 8099 (
    echo Could not find a free port between 8000 and 8099.
    pause
    exit /b 1
  )
  goto findport
)

echo.
echo  ==========================================
echo   Classroom Tools Hub
echo  ==========================================
echo   Serving folder: %~dp0
echo   URL:           http://localhost:%PORT%
echo  ------------------------------------------
echo   Close this window to stop the server.
echo.

REM --- Start server in background, then open the browser ---
start "" "http://localhost:%PORT%/index.html"
cd /d "%~dp0"
python -m http.server %PORT%

REM If python isn't found, try the 'py' launcher as a fallback
if %errorlevel% neq 0 (
  echo.
  echo  Python was not found on PATH. Trying 'py' launcher...
  py -m http.server %PORT%
)

pause
