# Create Custom Validators

**Impact: MEDIUM**

Create validators for logic not covered by built-in validators.

## Basic Validator

```tsx
const phone = (value: unknown): string | null => {
  if (!value) return null
  const regex = /^\+?[\d\s-]{9,}$/
  return regex.test(String(value)) ? null : 'Telefono invalido'
}
```

## Parameterized Validator

```tsx
const minValue = (min: number) => (value: unknown): string | null => {
  if (value === null) return null
  return Number(value) >= min ? null : `Minimo ${min}`
}

const range = (min: number, max: number) => (value: unknown): string | null => {
  if (value === null) return null
  const n = Number(value)
  return n >= min && n <= max ? null : `Debe estar entre ${min} y ${max}`
}

// Usage
<NumberField {...register('age')} validate={combine(required, range(18, 120))} />
```

Place reusable validators in `src/lib/validators.ts`.

Used in: `src/lib/validators.ts`
