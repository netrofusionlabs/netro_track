# NPM Workspace Configuration

> **Purpose:** Monorepo configuration with npm workspaces.

---

## Root package.json

```json
{
  "name": "netrotrack",
  "private": true,
  "workspaces": [
    "apps/backend",
    "apps/mobile",
    "packages/shared"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:mobile:android": "npm run android --workspace=apps/mobile",
    "dev:mobile:ios": "npm run ios --workspace=apps/mobile",
    "lint": "npm run lint --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

## Shared Package

`packages/shared/` contains:
- Zod validation schemas (shared between mobile and backend)
- TypeScript type definitions
- Constants (roles, limits, error codes)
- Utility functions (date formatting, validation helpers)

## Package References

```json
// apps/backend/package.json
{ "dependencies": { "@netrotrack/shared": "workspace:*" } }

// apps/mobile/package.json
{ "dependencies": { "@netrotrack/shared": "workspace:*" } }
```
