<#
.SYNOPSIS
    Starts the 711BF Gaming development servers.

.DESCRIPTION
    Launches the Colyseus game server, HTTP client server, and Traefik reverse proxy.
    All services accessible on Tailscale network at 100.66.58.107.

    HTTPS access via Traefik:
    - https://game.711bf.org     -> localhost:3000
    - wss://ws.game.711bf.org    -> localhost:2567

.PARAMETER NoTraefik
    Skip starting Traefik (local development only).

.EXAMPLE
    .\scripts\start-dev.ps1

.EXAMPLE
    .\scripts\start-dev.ps1 -NoTraefik
#>

param(
    [switch]$NoTraefik
)

$Traefik = -not $NoTraefik

$ErrorActionPreference = "Stop"

Write-Host "Starting 711BF Gaming Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes
Write-Host "Stopping any existing servers..." -ForegroundColor Yellow
Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process uv, python -ErrorAction SilentlyContinue | Stop-Process -Force
if ($Traefik) {
    Get-Process traefik -ErrorAction SilentlyContinue | Stop-Process -Force
}
Start-Sleep -Seconds 1

# Get Tailscale IP
$tailscaleIP = & tailscale ip -4 2>$null
if (-not $tailscaleIP) { $tailscaleIP = "localhost" }

# Start Colyseus server (Bun runtime)
Write-Host "Starting Colyseus server on port 2567..." -ForegroundColor Green
$serverPath = Join-Path $PSScriptRoot "..\server"
$bunPath = "$env:USERPROFILE\.bun\bin\bun.exe"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$serverPath`" && `"$bunPath`" run dev" -WindowStyle Minimized

# Wait for server to initialize
Start-Sleep -Seconds 3

# Start HTTP server for client (uv runtime)
Write-Host "Starting HTTP server on port 3000..." -ForegroundColor Green
$clientPath = Join-Path $PSScriptRoot "..\prototype"
$uvPath = "$env:USERPROFILE\.local\bin\uv.exe"
Start-Process -FilePath $uvPath -ArgumentList "run python -m http.server 3000 --bind 0.0.0.0" -WorkingDirectory $clientPath -WindowStyle Minimized

# Optionally start Traefik
if ($Traefik) {
    Write-Host "Starting Traefik reverse proxy..." -ForegroundColor Green
    $traefikScript = Join-Path $PSScriptRoot "start-traefik.ps1"
    & $traefikScript
}

Write-Host ""
Write-Host "=== Servers Running ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Game Client:" -ForegroundColor White
Write-Host "  Local:     http://localhost:3000" -ForegroundColor Gray
Write-Host "  Tailscale: http://${tailscaleIP}:3000" -ForegroundColor Green
if ($Traefik) {
    Write-Host "  HTTPS:     https://game.711bf.org" -ForegroundColor Magenta
}
Write-Host ""
Write-Host "Colyseus Server:" -ForegroundColor White
Write-Host "  WebSocket: ws://${tailscaleIP}:2567" -ForegroundColor Gray
if ($Traefik) {
    Write-Host "  WSS:       wss://ws.game.711bf.org" -ForegroundColor Magenta
}
Write-Host "  Monitor:   http://localhost:2568/colyseus" -ForegroundColor Gray
Write-Host ""
if ($Traefik) {
    Write-Host "Traefik Dashboard:" -ForegroundColor White
    Write-Host "  http://localhost:8080/dashboard/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop all: Get-Process bun, uv, traefik | Stop-Process" -ForegroundColor Yellow
} else {
    Write-Host "To stop servers: Get-Process bun, uv | Stop-Process" -ForegroundColor Yellow
    Write-Host "Tip: Traefik skipped. Remove -NoTraefik for HTTPS access." -ForegroundColor DarkGray
}
