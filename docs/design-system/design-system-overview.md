# Design System Overview

> **Purpose:** Define the complete design system with tokens, colors, typography, and spacing.
> **Dependencies:** [Product Philosophy](../product/product-philosophy.md)

---

## Design Principles

1. **Clean and professional** — Enterprise-grade appearance.
2. **Accessible** — WCAG 2.1 AA compliant contrast ratios.
3. **Consistent** — Every screen follows the same visual language.
4. **Light and Dark** — Full dual-theme support.
5. **Mobile-first** — Designed for one-handed operation.

---

## Color Tokens

### Brand Colors

| Token | Light Value | Dark Value | Usage |
|-------|-----------|----------|-------|
| `brand.primary` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | Primary actions, active states |
| `brand.primaryLight` | `#DBEAFE` | `#1E3A5F` | Backgrounds, subtle highlights |
| `brand.secondary` | `#059669` (Emerald 600) | `#10B981` (Emerald 500) | Success states, active tracking |
| `brand.accent` | `#F59E0B` (Amber 500) | `#FBBF24` | Warnings, highlights |

### Semantic Colors

| Token | Light Value | Dark Value | Usage |
|-------|-----------|----------|-------|
| `semantic.success` | `#059669` | `#10B981` | Punched in, synced |
| `semantic.warning` | `#D97706` | `#FBBF24` | Offline, pending |
| `semantic.error` | `#DC2626` | `#EF4444` | Errors, failed |
| `semantic.info` | `#2563EB` | `#3B82F6` | Information |

### Surface Colors

| Token | Light Value | Dark Value | Usage |
|-------|-----------|----------|-------|
| `surface.background` | `#F8FAFC` | `#0F172A` | App background |
| `surface.card` | `#FFFFFF` | `#1E293B` | Card backgrounds |
| `surface.elevated` | `#FFFFFF` | `#334155` | Modals, sheets |
| `surface.input` | `#F1F5F9` | `#1E293B` | Input backgrounds |

### Text Colors

| Token | Light Value | Dark Value | Usage |
|-------|-----------|----------|-------|
| `text.primary` | `#0F172A` | `#F8FAFC` | Headings, primary text |
| `text.secondary` | `#475569` | `#94A3B8` | Labels, secondary text |
| `text.tertiary` | `#94A3B8` | `#64748B` | Placeholders, hints |
| `text.inverse` | `#FFFFFF` | `#0F172A` | Text on brand colors |

---

## Typography

Font: **Inter** (Google Fonts)

| Token | Size | Weight | Line Height | Usage |
|-------|:----:|:------:|:-----------:|-------|
| `heading.xl` | 28 | Bold (700) | 36 | Screen titles |
| `heading.lg` | 24 | Bold (700) | 32 | Section headers |
| `heading.md` | 20 | SemiBold (600) | 28 | Card titles |
| `heading.sm` | 18 | SemiBold (600) | 24 | Sub-section headers |
| `body.lg` | 16 | Regular (400) | 24 | Body text |
| `body.md` | 14 | Regular (400) | 20 | Default text |
| `body.sm` | 12 | Regular (400) | 16 | Captions, metadata |
| `body.xs` | 10 | Medium (500) | 14 | Badges, chips |
| `label.lg` | 16 | Medium (500) | 24 | Input labels |
| `label.md` | 14 | Medium (500) | 20 | Button labels |
| `label.sm` | 12 | Medium (500) | 16 | Form labels |
| `number.xl` | 32 | Bold (700) | 40 | Dashboard stats |
| `number.lg` | 24 | Bold (700) | 32 | Metric values |

---

## Spacing Scale

| Token | Value | Usage |
|-------|:-----:|-------|
| `space.xxs` | 2 | Minimal gaps |
| `space.xs` | 4 | Tight spacing |
| `space.sm` | 8 | Default gap |
| `space.md` | 12 | Component padding |
| `space.lg` | 16 | Section spacing |
| `space.xl` | 24 | Content separation |
| `space.xxl` | 32 | Major sections |
| `space.xxxl` | 48 | Screen padding top |

---

## Border Radius

| Token | Value | Usage |
|-------|:-----:|-------|
| `radius.sm` | 6 | Inputs, badges |
| `radius.md` | 10 | Cards, buttons |
| `radius.lg` | 16 | Bottom sheets, modals |
| `radius.xl` | 24 | Feature cards |
| `radius.full` | 9999 | Avatars, pills |

---

## Shadows (Light Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.sm` | `0 1px 2px rgba(0,0,0,0.05)` | Inputs, flat cards |
| `shadow.md` | `0 4px 6px rgba(0,0,0,0.07)` | Elevated cards |
| `shadow.lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, bottom sheets |

---

## Icon System

Use **Phosphor Icons** (React Native Phosphor Icons) for consistent, modern iconography. Use the **Regular** weight for navigation and **Bold** for emphasis.
