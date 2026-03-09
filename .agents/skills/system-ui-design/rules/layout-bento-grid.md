# Bento Grid Layout

Use CSS Grid with varying spans for visual hierarchy.

## Rule

- Use `grid-cols-12` for flexible layouts
- Vary `col-span-X` and `row-span-Y` to create visual interest
- Keep consistent gap spacing

## Do

```tsx
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-8 row-span-2">Main</div>
  <div className="col-span-4">Sidebar</div>
</div>
```

## Don't

```tsx
<div className="grid grid-cols-3">All equal</div>
```
