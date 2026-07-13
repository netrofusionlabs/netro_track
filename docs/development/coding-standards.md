# Coding Standards

> **Purpose:** Define code quality standards and conventions.
> **Dependencies:** [Backend Overview](../backend/backend-overview.md), [Mobile Overview](../mobile/mobile-overview.md)

---

## TypeScript Standards

| Rule | Setting |
|------|---------|
| strict mode | ✅ Always |
| noImplicitAny | ✅ Always |
| strictNullChecks | ✅ Always |
| Target | ES2020 (backend), ESNext (mobile) |

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase.tsx | `LoginScreen.tsx`, `Button.tsx` |
| Files (logic) | camelCase.ts | `auth.service.ts`, `dateUtils.ts` |
| React components | PascalCase | `AttendanceCard`, `PunchButton` |
| Functions/methods | camelCase | `handlePunchIn`, `calculateDistance` |
| Constants | UPPER_SNAKE_CASE | `MAX_BUFFER_SIZE`, `API_BASE_URL` |
| Types/Interfaces | PascalCase | `UserRole`, `AttendanceRecord` |
| Enums | PascalCase (name), UPPER_SNAKE (values) | `UserRole.CLIENT_ADMIN` |
| Environment vars | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| Database tables | snake_case, plural | `attendance_records` |
| Database columns | snake_case | `company_id`, `punch_in_at` |
| API routes | kebab-case | `/customer-visits`, `/product-sales` |

## Code Formatting

- **Formatter:** Prettier
- **Linter:** ESLint with TypeScript rules
- **Print Width:** 100
- **Semi:** true
- **Single Quote:** true
- **Trailing Comma:** all
- **Tab Width:** 2

## Import Order

```typescript
// 1. Node built-ins
import path from 'path';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal aliases (@shared, @modules)
import { AppError } from '@shared/errors/AppError';
import { validate } from '@middleware/validate.middleware';

// 4. Relative imports
import { AttendanceService } from './attendance.service';
```

## Documentation

- Every service method: JSDoc with `@param` and `@returns`.
- Every API endpoint: Brief description in route file.
- Complex logic: Inline comments explaining "why", not "what".
