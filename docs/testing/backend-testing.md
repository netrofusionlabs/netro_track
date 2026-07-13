# Backend Testing

> **Purpose:** Define patterns for testing the backend application.
> **Dependencies:** [Testing Strategy](testing-strategy.md)

---

## Integration Test Pattern

We use `supertest` for integration testing. We test the API boundaries without mocking the database.

```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/shared/config/prisma';
import { seedTestUser } from '../fixtures/users';

describe('Auth API', () => {
  beforeEach(async () => {
    // Clear relevant tables
    await prisma.user.deleteMany();
  });

  it('should login with valid credentials', async () => {
    // 1. Arrange
    const user = await seedTestUser();

    // 2. Act
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        companyId: user.companyId,
        employeeId: user.employeeId,
        password: 'Password123!',
        deviceId: 'device-uuid',
      });

    // 3. Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });
});
```

## Mocking External Services

Services that make external network calls (e.g., Firebase Cloud Messaging, R2) MUST be mocked in tests.

```typescript
// Mocking FCM Service
vi.mock('../../src/shared/services/fcm.service', () => {
  return {
    FcmService: vi.fn().mockImplementation(() => {
      return { send: vi.fn().mockResolvedValue(true) };
    })
  };
});
```

## Test Database Setup

Integration tests require a real PostgreSQL database.

1. Use Docker Compose locally (`docker-compose up -d db-test`).
2. Run Prisma migrations on the test database before tests.
3. Use a unique database schema per test worker to avoid concurrency issues.
