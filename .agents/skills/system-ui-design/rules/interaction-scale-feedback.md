# Scale Feedback

Add tactile feedback on interaction.

## Rule

Use `active:scale-[0.98]` on buttons for press effect. Use `transition-all duration-200` for smooth transitions.

## Do

```tsx
<button className="transition-all duration-200 active:scale-[0.98]">
  Click me
</button>
```

## Don't

```tsx
<button className="hover:bg-blue-600">No scale feedback</button>
```
