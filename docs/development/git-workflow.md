# Git Workflow

> **Purpose:** Define Git branching, commit conventions, and workflow.

---

## Branch Strategy

```
main ─────────────────────────────── Production releases
  └── develop ────────────────────── Integration branch
        ├── feature/auth-login ───── Feature branches
        ├── feature/gps-tracking
        ├── fix/attendance-timezone
        └── hotfix/critical-bug ──── Hotfixes (from main)
```

## Branch Naming

```
feature/{module}-{description}    feature/auth-mpin-login
fix/{module}-{description}        fix/attendance-timezone-offset
hotfix/{description}              hotfix/jwt-refresh-loop
chore/{description}               chore/update-dependencies
docs/{description}                docs/api-reference-update
```

## Commit Messages

Format: `type(scope): description`

```
feat(auth): add MPIN login flow
fix(tracking): resolve GPS batch sync failure
chore(deps): update prisma to 5.x
docs(api): add attendance endpoint documentation
refactor(attendance): extract service from controller
test(auth): add login integration tests
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`

## Pull Request Rules

- PR title follows commit message format.
- Description includes: What, Why, How, Testing done.
- All CI checks must pass.
- At least one code review approval.
- Squash merge to develop; merge commit to main.
