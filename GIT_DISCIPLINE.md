# CrystalOS Git Discipline Card

This repository follows a deterministic, terminal-first Git workflow.
Use this exact sequence every time to avoid branch drift, accidental commits, and UI confusion.

## 1. Confirm repository root

```bash
cd /Users/data-house/projects/crystalclear-skills
```

If your repo lives somewhere else, replace the path with the correct root.

## 2. Check your current branch

```bash
git branch
```

Switch branches if needed:

```bash
git checkout <branch-name>
```

Create a new branch when starting work:

```bash
git checkout -b <new-branch-name>
```

## 3. Stage all changes

```bash
git add .
```

Review what’s staged:

```bash
git status
```

## 4. Commit everything

```bash
git commit -m "your message here"
```

Use short, atomic commit messages, for example:

- `add: investor deck markdown`
- `fix: terminal panel integration`
- `update: logs filtering`

## 5. Push to GitHub

```bash
git push
```

For a new branch:

```bash
git push --set-upstream origin <branch-name>
```

## 6. Confirm the push

Optional, but recommended:

```bash
git log --oneline --decorate --graph -n 5
```

## Full workflow block

```bash
cd /Users/data-house/projects/crystalclear-skills
git branch
git add .
git status
git commit -m "update"
git push
```

## Why this matters

- No VS Code drift
- No wrong-repo commits
- No UI confusion
- Repeatable, atomic Git operations
- Ideal for CrystalOS-style system development
