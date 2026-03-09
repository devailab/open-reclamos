# Border Radius

Use consistent border radius for a modern, organic feel.

## Rule

- Default: `rounded-xl` (12px)
- Cards: `rounded-2xl` (16px)
- Badges/pills: `rounded-full`
- Small elements: `rounded-lg` (8px)

## Do

```tsx
<button className="rounded-xl ...">Button</button>
<div className="rounded-2xl ...">Card</div>
<span className="rounded-full ...">Badge</span>
```

## Don't

```tsx
<button className="rounded-sm ...">Too small</button>
<div className="rounded ...">Inconsistent</div>
```
