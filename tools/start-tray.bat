@echo off
REM 711BF Gaming Server Tray App Launcher
cd /d "%~dp0"

REM Check if dependencies are installed
python -c "import pystray, PIL, winotify" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Start the tray app (hidden window)
start /B pythonw server_tray.py
