# Animation Guidelines

> **Purpose:** Define animation patterns and performance rules.
> **Dependencies:** [Design System Overview](design-system-overview.md)

---

## Technology: Reanimated v3+

All animations use `react-native-reanimated` for 60fps native thread animations.

## Animation Patterns

| Pattern | Where | Duration |
|---------|-------|:--------:|
| Screen transitions | React Navigation | 300ms |
| Punch button press | Attendance screen | 150ms scale |
| Card press | List items | 100ms opacity |
| Bottom sheet open | All sheets | 300ms slide |
| Skeleton shimmer | Loading states | 1.5s loop |
| Offline banner slide | Connectivity change | 250ms slide |
| Map marker appearance | Team map | 200ms fade+scale |
| Number count-up | Dashboard stats | 600ms spring |
| Status indicator pulse | Active tracking | 2s loop |

## Rules

- Use Reanimated `useAnimatedStyle` and `withSpring`/`withTiming` — NEVER `Animated` from React Native.
- Keep animations under 300ms for interactions, 500ms for transitions.
- Always use `worklet` functions for animation callbacks.
- Avoid layout animations on long lists (performance impact).
- Test animations on low-end Android devices.
