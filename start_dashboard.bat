@echo off
echo ========================================================
echo   Sentinel Dashboard - Startup Script
echo ========================================================

echo.
echo [1/2] Starting the Flask Backend API (Port 5000)...
start "Flask Backend (Do Not Close)" cmd /k "python app.py"

echo.
echo [2/2] Waiting for the server to boot before opening browser...
timeout /t 5 /nobreak > nul

echo.
echo Opening Sentinel Dashboard in your default browser...
start http://localhost:5000

echo.
echo ========================================================
echo   Dashboard is running! Do not close the Flask window.
echo   Press Ctrl+C in the Flask window to stop.
echo ========================================================
