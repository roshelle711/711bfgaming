# 711BF Gaming Server Tray App

A Windows system tray application for managing the game servers.

## Features

- **Start/Stop/Restart** game servers from system tray
- **Toast notifications** for all server state changes
- **Quick access** to open game client and Colyseus monitor
- **Status indicator** - icon color shows server state:
  - Green = All servers running
  - Yellow = Starting/stopping or partial
  - Red = Stopped

## Usage

### Quick Start
Double-click `start-tray.bat` or run:
```powershell
python tools/server_tray.py
```

### Tray Menu Options
Right-click the tray icon to access:
- **Start Servers** - Launch Colyseus + HTTP server
- **Stop Servers** - Shutdown all servers
- **Restart Servers** - Stop then start servers
- **Open Game** - Open http://localhost:3000 in browser
- **Open Monitor** - Open Colyseus monitor dashboard
- **Show Status** - Display current server status
- **Quit** - Stop servers and exit tray app

## Servers Managed

| Server | Port | Purpose |
|--------|------|---------|
| Colyseus | 2567 | WebSocket game server |
| HTTP | 3000 | Static file server for client |

## Requirements

- Python 3.10+
- Dependencies in `requirements.txt`:
  - pystray (system tray)
  - Pillow (icon generation)
  - winotify (toast notifications)

## Installation

```powershell
cd tools
pip install -r requirements.txt
```

Then run `start-tray.bat` or add it to Windows startup.
