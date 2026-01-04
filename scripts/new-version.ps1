<#
.SYNOPSIS
    Creates a new version with GitHub Issue and feature branch.

.DESCRIPTION
    This script automates the version release workflow:
    1. Creates a GitHub Issue for the new version
    2. Creates a feature branch (e.g., feature/v9)
    3. Updates game.js version comment
    4. Outputs next steps for development

.PARAMETER Version
    The version number (e.g., 9, 10, 11)

.PARAMETER Title
    Short title for this version (e.g., "Multiplayer Foundation")

.PARAMETER Features
    Array of planned features for this version

.EXAMPLE
    .\new-version.ps1 -Version 9 -Title "Quest System" -Features @("Basic quest framework", "NPC quest givers", "Quest log UI")
#>

param(
    [Parameter(Mandatory=$true)]
    [int]$Version,

    [Parameter(Mandatory=$true)]
    [string]$Title,

    [Parameter(Mandatory=$false)]
    [string[]]$Features = @("Feature 1", "Feature 2", "Feature 3")
)

$ErrorActionPreference = "Stop"

# Build issue body
$featureList = ($Features | ForEach-Object { "- [ ] $_" }) -join "`n"
$issueBody = @"
## Summary
$Title

## Planned Features
$featureList

## Technical Notes
_Add implementation details here_

## Testing Checklist
- [ ] All features working in Chrome
- [ ] No console errors
- [ ] Performance acceptable

---
*Started: $(Get-Date -Format 'yyyy-MM-dd')*
"@

# Create temp file for issue body
$tempFile = [System.IO.Path]::GetTempFileName()
$issueBody | Out-File -FilePath $tempFile -Encoding utf8

try {
    # Create GitHub Issue
    Write-Host "Creating GitHub Issue for v$Version..." -ForegroundColor Cyan
    $issueUrl = gh issue create --title "v$Version`: $Title" --body-file $tempFile
    $issueNumber = ($issueUrl -split '/')[-1]
    Write-Host "Created Issue #$issueNumber`: $issueUrl" -ForegroundColor Green

    # Create feature branch
    Write-Host "Creating feature branch..." -ForegroundColor Cyan
    git checkout -b "feature/v$Version"
    Write-Host "Created branch: feature/v$Version" -ForegroundColor Green

    # Update game.js version comment
    $gameJsPath = Join-Path $PSScriptRoot "..\prototype\game.js"
    $content = Get-Content $gameJsPath -Raw
    $oldVersion = "Prototype v$($Version - 1)"
    $newVersion = "Prototype v$Version"
    $content = $content -replace "Prototype v\d+", $newVersion
    $content | Set-Content $gameJsPath -NoNewline
    Write-Host "Updated game.js to v$Version" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Yellow
    Write-Host "1. Implement features for v$Version"
    Write-Host "2. Update TODO.md as you work"
    Write-Host "3. When ready, run: .\scripts\create-pr.ps1 -Version $Version"
    Write-Host ""
    Write-Host "Issue: $issueUrl" -ForegroundColor Cyan
    Write-Host "Branch: feature/v$Version" -ForegroundColor Cyan

} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
