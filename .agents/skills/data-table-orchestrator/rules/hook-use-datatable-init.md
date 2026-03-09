# Initialize useDataTable with Proper Typing

**Impact: CRITICAL (ensures type safety across the data table)**

Initialize `useDataTable` with proper generic types for row data and filter state. This ensures type safety for columns, rows, and filter operations.

## Incorrect

```tsx
const { controller, defineColumns, search } = useDataTable({
  getRowId: (row) => row.id,
  setRows,
  fetchData: fetchStores,
  filters,
  setFilters,
})
```

Missing type parameters leads to:
- No autocomplete for row properties in cell renderers
- No compile-time checking for filter field access
- Harder to refactor when row/filter types change

## Correct

```tsx
const {
  controller,
  defineColumns,
  search,
  setPage,
  page,
  pageSize,
  debouncedFilters,
} = useDataTable<StoreRow, StoreFilters>({
  getRowId: (row) => row.id,
  setRows,
  fetchData: fetchStores,
  filters,
  setFilters,
})
```

The hook returns:
- `controller`: Passed to DataTable component for pagination/selection controls
- `defineColumns`: Helper function for creating type-safe column definitions
- `search`: Manual trigger function for data fetching
- `setPage` / `page`: Pagination state and setter
- `pageSize`: Current page size
- `debouncedFilters`: Filters with 300ms debounce for effect dependencies

## Additional Context

The generic type parameters are:
- `T`: The row type (e.g., `StoreRow`, `ComplaintReasonRow`)
- `F`: The filter type (e.g., `StoreFilters`, `ReasonFilters`)

This pattern is used in:
- `src/app/app/(dashboard)/stores/page.tsx`
- `src/app/app/(dashboard)/reasons/page.tsx`
