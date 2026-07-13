# Mobile Testing

> **Purpose:** Define patterns for testing the mobile application.
> **Dependencies:** [Testing Strategy](testing-strategy.md)

---

## Component Test Pattern

We use `@testing-library/react-native` (RNTL).

```typescript
// __tests__/components/PunchButton.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { PunchButton } from '../../src/features/attendance/components/PunchButton';
import { ThemeProvider } from '../../src/shared/theme/ThemeProvider';

// Wrapper for required providers
const AllTheProviders = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PunchButton', () => {
  it('renders correctly and responds to press', () => {
    const mockOnPress = jest.fn();
    
    const { getByText } = render(
      <PunchButton 
        status="OFFLINE" 
        onPress={mockOnPress} 
        loading={false} 
      />,
      { wrapper: AllTheProviders }
    );
    
    const button = getByText('Punch In');
    fireEvent.press(button);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

## End-to-End Testing (Detox)

Detox provides grey-box end-to-end testing.

```javascript
// e2e/login.test.js
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show login screen on first launch', async () => {
    await expect(element(by.id('login_screen'))).toBeVisible();
  });

  it('should login successfully', async () => {
    await element(by.id('input_employee_id')).typeText('EMP001');
    await element(by.id('input_password')).typeText('Password123!\n');
    await element(by.id('btn_login')).tap();
    
    await expect(element(by.id('dashboard_screen'))).toBeVisible();
  });
});
```

## Testing Hooks

Use `@testing-library/react-hooks` or the built-in hook testing utilities in RNTL to test custom hooks that manage complex state or coordinate multiple API calls.
