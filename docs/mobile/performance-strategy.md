# Performance Strategy (Mobile)

> **Purpose:** Performance optimization techniques.
> **Dependencies:** [Mobile Overview](mobile-overview.md)

---

## Targets

| Metric | Target |
|--------|--------|
| App launch (cold) | < 3 seconds |
| Screen transition | < 300ms |
| List scrolling | 60fps |
| Memory usage | < 200MB |

## Optimization Techniques

| Technique | Application |
|-----------|------------|
| **FlatList virtualization** | All lists use FlatList with `getItemLayout` |
| **React.memo** | Expensive list items and map markers |
| **Image caching** | FastImage or React Native Image with cache headers |
| **Lazy loading** | Screens loaded on navigation (React.lazy) |
| **Skeleton screens** | Show layout placeholders during data loading |
| **Optimistic updates** | UI updates immediately; rollback on failure |
| **Debounced search** | 300ms debounce on search inputs |
| **Minimal re-renders** | Zustand selector subscriptions |
| **Bundle splitting** | Feature modules lazy-loaded |
| **Hermes engine** | Enabled for Android and iOS |
