# 711BF Gaming - Development Scripts

## Version Release Workflow

### Starting a New Version

```powershell
.\scripts\new-version.ps1 -Version 9 -Title "Quest System" -Features @(
    "Basic quest framework",
    "NPC quest givers",
    "Quest log UI"
)
```

This will:
1. Create a GitHub Issue for v9
2. Create a `feature/v9` branch
3. Update game.js version comment

### During Development

1. Make changes on the feature branch
2. Commit regularly with descriptive messages
3. Update `TODO.md` as you complete tasks

### Creating a Pull Request

```powershell
.\scripts\create-pr.ps1 -Version 9
```

This will:
1. Push the branch to GitHub
2. Create a PR referencing the Issue
3. Include commit history in PR description

### After Merge

1. Update `DONE.md` with completed features (include `file:line` references)
2. Close the Issue if not auto-closed
3. Delete the feature branch:
   ```powershell
   git checkout master
   git pull
   git branch -d feature/v9
   ```

## Quick Reference

| Task | Command |
|------|---------|
| Start v9 | `.\scripts\new-version.ps1 -Version 9 -Title "Title"` |
| Create PR | `.\scripts\create-pr.ps1 -Version 9` |
| Merge PR | `gh pr merge --squash` |
| View Issues | `gh issue list` |
| View PRs | `gh pr list` |
