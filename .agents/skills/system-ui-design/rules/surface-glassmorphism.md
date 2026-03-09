# Glassmorphism & Surfaces

Use backdrop blur and semi-transparent backgrounds for layered depth.

## Rule

- Backgrounds: `bg-background` or `bg-background/70` with `backdrop-blur-md` or `backdrop-blur-xl`
- Shadows: Use custom shadows like `shadow-[0_20px_45px_-35px_rgba(15,23,42,0.1)]`

## Do

```tsx
<div className="bg-background/70 backdrop-blur-md border border-border/70 rounded-2xl shadow-[0_20px_45px_-35px_rgba(15,23,42,0.1)]">
  Glass card
</div>
```

## Don't

```tsx
<div className="bg-white">Solid, no depth</div>
```
