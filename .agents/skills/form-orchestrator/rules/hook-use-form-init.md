# Initialize useForm with Proper Typing

**Impact: HIGH**

Initialize `useForm` with state and initial values. This hook connects field components to form state.

## Usage

```tsx
const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
const { register, validate, reset } = useForm({
  values,
  setValues,
  initialValues: INITIAL_VALUES,
})
```

## Returns

- `register`: Connect fields to form state
- `validate`: Trigger validation on all fields
- `reset`: Restore form to initial values

## Form Values Type

```tsx
interface FormValues {
  name: string | null
  email: string | null
  age: number | null
  isActive: boolean
}

const INITIAL_VALUES: FormValues = {
  name: null,
  email: null,
  age: null,
  isActive: false,
}
```

## Usage with Fields

```tsx
<TextField {...register('name')} validate={required} />
<TextField {...register('email')} validate={combine(required, email)} />

<Button onClick={() => {
  const errors = validate()
  if (errors.length) return
  // Submit
}}>Submit</Button>
```

Used in: `src/hooks/use-form.ts`, `src/app/example/page.tsx`
