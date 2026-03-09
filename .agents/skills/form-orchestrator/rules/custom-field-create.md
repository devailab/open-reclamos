# Create Custom Field Components

**Impact: MEDIUM**

Create custom fields to extend the form system. Place in `src/components/` for global use or in `*/_features/` for feature-specific.

## Field Structure

```tsx
import { useId, useImperativeHandle, useRef, useState } from 'react'
import type { FormFieldProps, FormFieldRef } from '@/hooks/use-form'
import { cn } from '@/lib/utils'

interface CustomFieldProps extends FormFieldProps<string | null> {
  label?: ReactNode
  placeholder?: string
}

export const CustomField = ({
  label,
  value,
  ref,
  onValueChange,
  validate,
  placeholder,
}: CustomFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    validate: () => {
      if (!validate) return null
      const err = validate(value ?? null)
      setError(err)
      return err
    },
  }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onValueChange?.(newValue || null)
    if (error && validate) {
      setError(validate(newValue || null))
    }
  }

  return (
    <div className={cn('w-full space-y-1')}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        id={inputId}
        ref={inputRef}
        value={value ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(error && 'border-destructive')}
      />
      {error && <p className='text-sm text-destructive'>{error}</p>}
    </div>
  )
}
```

## Key Points

1. **Extend `FormFieldProps<T>`** - Get value, onValueChange, validate, ref
2. **Use `useImperativeHandle`** - Expose focus() and validate()
3. **Call validate on change** - If field has error, re-validate
4. **Manage error state internally** - Display error message

## Feature-Specific Fields

For fields only used in one feature:

```
src/app/app/(dashboard)/reasons/_features/
├── reason-form.tsx
├── custom-reason-field.tsx  # Feature-specific field
```

## Usage

```tsx
// Global
import { CustomField } from '@/components/custom-field'

// Feature-specific
import { CustomField } from '../_features/custom-field'

<CustomField
  {...register('fieldName')}
  label='Label'
  validate={required}
/>
```

Used in: `src/components/text-field.tsx`, `src/components/*field*.tsx`
