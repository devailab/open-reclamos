# Define Type-Safe Columns

**Impact: CRITICAL (enables IDE autocomplete and type checking)**

Use the `defineColumns` helper to create column definitions with full type inference. This enables IDE autocomplete for row properties.

## Incorrect

```tsx
const columns = [
  {
    header: { render: () => 'Nombre' },
    cell: ({ row }) => row.name, // No type safety
  },
]
```

Problems:
- No autocomplete for row properties
- No compile-time error for invalid property access
- Harder to refactor when row type changes

## Correct

```tsx
const columns = defineColumns([
  {
    header: { render: () => 'Nombre' },
    cell: ({ row }) => row.name, // Full type inference
  },
  {
    header: { render: () => 'Tipo' },
    cell: ({ row }) => (
      <Badge variant='secondary'>
        {row.type === 'physical' ? 'Fisica' : 'Virtual'}
      </Badge>
    ),
  },
])
```

Each column has:
- `header`: Object with `render()` function returning React node (header content)
- `cell`: Function receiving `{ row }` with full type inference, returning React node

## Column Structure

```tsx
interface DataTableColumn<T> {
  header: {
    render: () => React.ReactNode
    onSort?: () => void // For future sorting implementation
  }
  cell: ({ row }: { row: T }) => React.ReactNode
}
```

## Additional Context

The `defineColumns` helper is returned from `useDataTable`:

```tsx
const { controller, defineColumns } = useDataTable<RowType, FilterType>({
  getRowId: (row) => row.id,
  setRows,
  fetchData,
})
```

Usage:
```tsx
const columns = defineColumns([...])
```

This pattern provides:
- Full IDE autocomplete for `row` property access
- Type checking for all cell renderers
- Consistent column definition structure
