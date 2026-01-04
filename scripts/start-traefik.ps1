<#
.SYNOPSIS
    Starts Traefik reverse proxy for 711BF Gaming.

.DESCRIPTION
    Runs Traefik with Tailscale TLS certificates to provide HTTPS access
    to the game client and WebSocket server.

    Routing:
    - https://game.711bf.org     -> localhost:3000 (HTTP client)
    - wss://ws.game.711bf.org    -> localhost:2567 (Colyseus WebSocket)

.EXAMPLE
    .\scripts\start-traefik.ps1
#>

$ErrorActionPreference = "Stop"

$traefikDir = Join-Path $PSScriptRoot "..\infrastructure\traefik"
$traefikExe = Join-Path $traefikDir "traefik.exe"

Write-Host ""
Write-Host "=== 711BF Gaming - Traefik Reverse Proxy ===" -ForegroundColor Cyan
Write-Host ""

# Check if traefik.exe exists
if (-not (Test-Path $traefikExe)) {
    Write-Host "ERROR: traefik.exe not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Download Traefik for Windows:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://github.com/traefik/traefik/releases" -ForegroundColor White
    Write-Host "  2. Download: traefik_v3.x.x_windows_amd64.zip" -ForegroundColor White
    Write-Host "  3. Extract traefik.exe to:" -ForegroundColor White
    Write-Host "     $traefikDir" -ForegroundColor Green
    Write-Host ""
    Write-Host "Or use winget:" -ForegroundColor Yellow
    Write-Host "  winget install Traefik.Traefik" -ForegroundColor White
    Write-Host "  (then copy traefik.exe to the infrastructure/traefik folder)" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Check if config files exist
$staticConfig = Join-Path $traefikDir "traefik.yml"
$dynamicConfig = Join-Path $traefikDir "config.yml"

if (-not (Test-Path $staticConfig)) {
    Write-Host "ERROR: traefik.yml not found in $traefikDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $dynamicConfig)) {
    Write-Host "ERROR: config.yml not found in $traefikDir" -ForegroundColor Red
    exit 1
}

# Kill any existing Traefik process
$existingTraefik = Get-Process traefik -ErrorAction SilentlyContinue
if ($existingTraefik) {
    Write-Host "Stopping existing Traefik process..." -ForegroundColor Yellow
    Stop-Process -Name traefik -Force
    Start-Sleep -Seconds 1
}

# Start Traefik
Write-Host "Starting Traefik..." -ForegroundColor Green
Write-Host ""

Push-Location $traefikDir
try {
    # Run Traefik with the static config
    Start-Process -FilePath $traefikExe -ArgumentList "--configFile=traefik.yml" -WindowStyle Minimized
    Start-Sleep -Seconds 2

    Write-Host "=== Traefik Running ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Dashboard:" -ForegroundColor White
    Write-Host "  http://localhost:8080/dashboard/" -ForegroundColor Green
    Write-Host ""
    Write-Host "Routes:" -ForegroundColor White
    Write-Host "  Game Client:     https://game.711bf.org" -ForegroundColor Green
    Write-Host "  WebSocket:       wss://ws.game.711bf.org" -ForegroundColor Green
    Write-Host ""
    Write-Host "DNS Requirements:" -ForegroundColor Yellow
    Write-Host "  game.711bf.org     -> 100.66.58.107" -ForegroundColor Gray
    Write-Host "  ws.game.711bf.org  -> 100.66.58.107" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop: Stop-Process -Name traefik" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
