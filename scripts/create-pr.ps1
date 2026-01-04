<#
.SYNOPSIS
    Creates a Pull Request for a version branch.

.DESCRIPTION
    This script automates PR creation:
    1. Pushes the feature branch to origin
    2. Creates a PR that references the version Issue
    3. Includes a summary of changes

.PARAMETER Version
    The version number (e.g., 9, 10, 11)

.EXAMPLE
    .\create-pr.ps1 -Version 9
#>

param(
    [Parameter(Mandatory=$true)]
    [int]$Version
)

$ErrorActionPreference = "Stop"

$branch = "feature/v$Version"

# Verify we're on the correct branch
$currentBranch = git branch --show-current
if ($currentBranch -ne $branch) {
    Write-Host "Error: Not on branch $branch (currently on $currentBranch)" -ForegroundColor Red
    Write-Host "Run: git checkout $branch" -ForegroundColor Yellow
    exit 1
}

# Get the issue number for this version
Write-Host "Finding Issue for v$Version..." -ForegroundColor Cyan
$issues = gh issue list --search "v$Version" --state open --json number,title | ConvertFrom-Json
$issue = $issues | Where-Object { $_.title -match "^v$Version`:" }

if (-not $issue) {
    # Try closed issues
    $issues = gh issue list --search "v$Version" --state closed --json number,title | ConvertFrom-Json
    $issue = $issues | Where-Object { $_.title -match "^v$Version`:" }
}

$issueRef = if ($issue) { "Closes #$($issue.number)" } else { "" }

# Get commit messages for this branch
$commits = git log master..$branch --oneline 2>$null
if (-not $commits) {
    $commits = git log --oneline -10
}

# Build PR body
$prBody = @"
## Summary
Version $Version implementation.

## Changes
$($commits -join "`n")

$issueRef

## Testing
- [ ] Tested in Chrome
- [ ] No console errors
- [ ] All features working

---
Generated with Claude Code
"@

$tempFile = [System.IO.Path]::GetTempFileName()
$prBody | Out-File -FilePath $tempFile -Encoding utf8

try {
    # Push branch
    Write-Host "Pushing branch to origin..." -ForegroundColor Cyan
    git push -u origin $branch

    # Create PR
    Write-Host "Creating Pull Request..." -ForegroundColor Cyan
    $prUrl = gh pr create --title "v$Version" --body-file $tempFile --base master
    Write-Host "Created PR: $prUrl" -ForegroundColor Green

    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Yellow
    Write-Host "1. Review the PR on GitHub"
    Write-Host "2. When approved, merge with: gh pr merge --squash"
    Write-Host "3. Update DONE.md with completed features"
    Write-Host "4. Delete branch: git branch -d $branch"

} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}
