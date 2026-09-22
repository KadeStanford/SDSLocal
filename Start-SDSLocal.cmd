@echo off
setlocal
set "ROOT=%~dp0"
where pwsh >nul 2>&1
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local.ps1"
)
if not %errorlevel%==0 pause
endlocal
