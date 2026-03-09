# Elevation Levels

Use subtle, diffuse shadows for depth instead of harsh black shadows.

## Rule

- Card shadow: `shadow-[0_20px_45px_-35px_rgba(15,23,42,0.1)]`
- Button shadow (primary): `shadow-[0_10px_24px_-16px_hsl(var(--primary))]`

## Do

```tsx
<div className="shadow-[0_20px_45px_-35px_rgba(15,23,42,0.1)]">
  Elevated card
</div>
```

## Don't

```tsx
<div className="shadow-md">Harsh shadow</div>
```
