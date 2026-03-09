# Available Field Components

**Impact: HIGH**

Use the right field type for each data type.

## Field Components

| Component | Type | Use Case |
|-----------|------|----------|
| `TextField` | `string \| null` | Text input |
| `NumberField` | `number \| null` | Numbers |
| `TextAreaField` | `string \| null` | Long text |
| `SelectField` | `SelectOption \| null` | Simple dropdown |
| `ComboboxField` | `ComboboxOption \| null` | Searchable dropdown |
| `AutocompleteField` | `AutocompleteOption \| null` | Async search |
| `DateField` | `Date \| null` | Date picker |
| `TimeField` | `string \| null` | Time picker |
| `BooleanField` | `boolean` | Toggle |

## Interface

All fields implement:

```tsx
interface FormFieldProps<T> {
  value?: T
  onValueChange?: (value: T) => void
  validate?: (value: T) => string | null
  ref?: Ref<FormFieldRef>
}
```

## Usage

```tsx
<TextField {...register('name')} validate={required} />
<NumberField {...register('age')} />
<ComboboxField {...register('country')} options={COUNTRIES} />
<DateField {...register('birthDate')} />
<BooleanField {...register('isActive')} />
```

Location: `src/components/*field*.tsx`

Used in: `src/app/example/page.tsx`
