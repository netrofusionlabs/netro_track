# State Management

> **Purpose:** Define client and server state management patterns.
> **Dependencies:** [Mobile Overview](mobile-overview.md)

---

## Two-State Model

| State Type | Technology | Persistence | Purpose |
|-----------|-----------|:-----------:|---------|
| **Client State** | Zustand | MMKV | Theme, auth, offline queue, UI state |
| **Server State** | TanStack Query | In-memory cache | API data, caching, refetching |

---

## Zustand Stores

| Store | Contents | Persisted |
|-------|---------|:---------:|
| `authStore` | User profile, tokens, auth state | ✅ MMKV |
| `themeStore` | Active theme, color scheme preference | ✅ MMKV |
| `syncStore` | Offline queue, sync status, pending count | ✅ MMKV |
| `attendanceStore` | Current attendance session state | ✅ MMKV |
| `trackingStore` | GPS buffer, tracking active flag | ✅ MMKV |

```typescript
// Example: authStore
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-store', storage: createMMKVStorage() }
  )
);
```

---

## TanStack Query Patterns

```typescript
// Query keys follow [module, ...params] convention
const queryKeys = {
  attendance: {
    today: (userId: string) => ['attendance', 'today', userId],
    history: (userId: string, month: string) => ['attendance', 'history', userId, month],
  },
  dashboard: {
    user: (userId: string) => ['dashboard', 'user', userId],
    manager: (managerId: string) => ['dashboard', 'manager', managerId],
  },
};

// Hook usage
function useAttendanceToday() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.attendance.today(user.id),
    queryFn: () => attendanceService.getToday(),
    staleTime: 30_000,  // 30 seconds
    refetchOnFocus: true,
  });
}
```

---

## Rules

- **Never** store server data in Zustand — use TanStack Query.
- **Never** make API calls in components — use hooks with TanStack Query.
- **Always** define query keys as constants for cache consistency.
- **Persist** only data needed across app restarts (auth, theme, offline queue).
