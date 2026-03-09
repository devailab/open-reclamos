# Subtle Borders

Use semi-transparent borders instead of solid colors.

## Rule

Use `border-border/X` where X is opacity (70 or 80).

## Do

```tsx
<div className="border border-border/70 rounded-xl">
  Content
</div>
<input className="border border-input/80 rounded-xl" />
```

## Don't

```tsx
<div className="border border-gray-300">Too harsh</div>
```
