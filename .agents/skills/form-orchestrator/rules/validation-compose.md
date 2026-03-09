# Combine Multiple Validators

**Impact: HIGH**

Use `combine` to compose validators. First error stops execution.

## Usage

```tsx
import { required, minLength, email, combine } from '@/lib/validators'

// Compose validators
<TextField {...register('name')} validate={combine(required, minLength(2))} />
<TextField {...register('email')} validate={combine(required, email)} />
```

## Built-in Validators

- `required`: null, undefined, empty string → error
- `email`: invalid format → error (allows empty)
- `minLength(n)`: too short → error

## Custom Combinations

```tsx
const validatePassword = combine(required, minLength(8))
const validatePhone = combine(required, phone)
```

All validators return `string | null`: error message or null if valid.

Used in: `src/lib/validators.ts`, `src/app/example/page.tsx`
