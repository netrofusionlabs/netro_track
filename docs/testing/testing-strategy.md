# Testing Strategy

> **Purpose:** Define the testing approach, tools, and coverage targets.
> **Dependencies:** [Backend Overview](../backend/backend-overview.md), [Mobile Overview](../mobile/mobile-overview.md)

---

## Test Pyramid

We follow the standard test pyramid:

1. **Unit Tests (60%)**: Test isolated functions, pure utilities, hooks, and services.
2. **Integration Tests (30%)**: Test API endpoints with database, and mobile component trees.
3. **End-to-End Tests (10%)**: Test full user workflows across the stack.

---

## Tooling

### Backend
| Testing Type | Tool | Purpose |
|--------------|------|---------|
| Unit | Vitest | Fast execution, ESM support |
| Integration | Vitest + Supertest | API endpoint testing |
| Mocking | vi.mock | Mocking external services |
| Test DB | Neon branching | Isolated DB for tests |

### Mobile
| Testing Type | Tool | Purpose |
|--------------|------|---------|
| Unit / Component | Jest + React Native Testing Library | Render testing |
| End-to-End | Detox | Black-box mobile testing |
| Mocking | MSW (Mock Service Worker) | Mocking API responses |

---

## Coverage Targets

| Area | Target Coverage | Enforcement |
|------|:---------------:|-------------|
| Shared Utilities | 90% | CI Gate |
| Backend Services | 80% | CI Gate |
| Backend Controllers| 70% | CI Gate |
| Mobile Hooks | 80% | CI Gate |
| Mobile Components | 60% | CI Gate |

## Continuous Integration

Tests run automatically on every Pull Request via GitHub Actions.
- Fast tests (unit, linting, typecheck) run on every push.
- Integration tests run on PR creation/update.
- E2E tests run on nightly builds and release tags.
