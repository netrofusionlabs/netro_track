# Theme Engine

> **Purpose:** Define the theme switching mechanism.
> **Dependencies:** [Design System Overview](design-system-overview.md)

---

## Implementation

```typescript
// tokens.ts — all theme tokens as TypeScript objects
export const lightTheme = {
  colors: {
    brand: { primary: '#2563EB', primaryLight: '#DBEAFE', ... },
    semantic: { success: '#059669', warning: '#D97706', error: '#DC2626', ... },
    surface: { background: '#F8FAFC', card: '#FFFFFF', ... },
    text: { primary: '#0F172A', secondary: '#475569', ... },
  },
  typography: { ... },
  spacing: { ... },
  borderRadius: { ... },
};

export const darkTheme = { /* mirror structure with dark values */ };
```

## ThemeProvider

```typescript
// ThemeProvider.tsx
const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }) {
  const { colorScheme } = useThemeStore();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

## Usage

```typescript
function MyComponent() {
  const theme = useTheme();
  return <View style={{ backgroundColor: theme.colors.surface.card }} />;
}
```

## Rules

- **Never** hardcode hex colors — always use `theme.colors.*`.
- **Default** to system color scheme; user can override.
- **Persist** preference in MMKV via themeStore.
