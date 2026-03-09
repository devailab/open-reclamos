---
name: system-ui-design
description: UI design patterns for this codebase. Reference when building components in src/components/ui/. Defines visual style, surface treatment, and interaction patterns.
---

# System UI Design

Visual design rules for this codebase. These patterns are already implemented in `src/components/ui/`.

## When to Apply

Reference these guidelines when:
- Creating or modifying UI components in `src/components/ui/`
- Building dashboard layouts or complex interfaces
- Implementing component variants

## Quick Reference

| Priority | Category | Impact |
| -------- | -------- | ------ |
| 1 | Borders & Radius | HIGH |
| 2 | Surfaces | HIGH |
| 3 | Focus & Interaction | MEDIUM |

### 1. Borders & Radius (HIGH)

- `border-radius`: Use `rounded-xl` (12px) as default. Cards use `rounded-2xl`. Badges use `rounded-full`.
- `border`: Use `border-border/70` or `border-border/80` for subtle borders.

### 2. Surfaces (HIGH)

- `background`: Use `bg-background` or semi-transparent `bg-background/70`.
- `glassmorphism`: Cards use `backdrop-blur-xl` with subtle shadows.
- `shadows`: Cards use `shadow-[0_20px_45px_-35px_rgba(15,23,42,0.1)]`.

### 3. Focus & Interaction (MEDIUM)

- `focus-ring`: Use `focus-visible:border-ring focus-visible:ring-[3px]`.
- `active-state`: Buttons use `active:scale-[0.98]` for tactile feedback.

## Key Patterns

- **CVA**: Use `class-variance-authority` for component variants (see `button.tsx`, `badge.tsx`).
- **Data attributes**: Always include `data-slot`, and optionally `data-variant`, `data-size`.
- **cn() utility**: Always wrap classNames with `cn()` from `@/lib/utils`.
- **Semi-transparent borders**: `border-border/70` instead of full opacity.

## Examples

See the actual implementations in:
- `src/components/ui/button.tsx` - Button variants with shadows
- `src/components/ui/card.tsx` - Card with glassmorphism
- `src/components/ui/input.tsx` - Input with subtle border
- `src/components/ui/badge.tsx` - Badge with full rounded corners
