<#
.SYNOPSIS
    Starts the 711BF Gaming development servers.

.DESCRIPTION
    Launches both the Colyseus game server and the HTTP client server.
    Both are accessible on the Tailscale network at 100.66.58.107.

.EXAMPLE
    .\scripts\start-dev.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "Starting 711BF Gaming Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "Stopping any existing servers..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Get Tailscale IP
$tailscaleIP = & tailscale ip -4 2>$null
if (-not $tailscaleIP) { $tailscaleIP = "localhost" }

# Start Colyseus server
Write-Host "Starting Colyseus server on port 2567..." -ForegroundColor Green
$serverPath = Join-Path $PSScriptRoot "..\server"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$serverPath`" && npm run dev" -WindowStyle Minimized

# Wait for server to initialize
Start-Sleep -Seconds 3

# Start HTTP server for client
Write-Host "Starting HTTP server on port 3000..." -ForegroundColor Green
$clientPath = Join-Path $PSScriptRoot "..\prototype"
Start-Process -FilePath "python" -ArgumentList "-m http.server 3000 --bind 0.0.0.0" -WorkingDirectory $clientPath -WindowStyle Minimized

Write-Host ""
Write-Host "=== Servers Running ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Game Client:" -ForegroundColor White
Write-Host "  Local:     http://localhost:3000" -ForegroundColor Gray
Write-Host "  Tailscale: http://${tailscaleIP}:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Colyseus Server:" -ForegroundColor White
Write-Host "  WebSocket: ws://${tailscaleIP}:2567" -ForegroundColor Gray
Write-Host "  Monitor:   http://localhost:2567/colyseus" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop servers: Get-Process node, python | Stop-Process" -ForegroundColor Yellow
