# Auto-Fetch on Page/Size Changes

**Impact: HIGH (ensures data stays in sync with pagination state)**

The `useEffect` with `[page, pageSize, debouncedFilters]` dependency array automatically fetches data when pagination changes.

## Implementation

```tsx
const {
  controller,
  defineColumns,
  search,
  setPage,
  page,
  pageSize,
  debouncedFilters,
} = useDataTable<RowType, FilterType>({
  getRowId: (row) => row.id,
  setRows,
  fetchData,
  filters,
  setFilters,
})

// biome-ignore lint/correctness/useExhaustiveDependencies: search is not memoized
useEffect(() => {
  search()
}, [page, pageSize, debouncedFilters])
```

## Behavior

| Trigger | What Happens |
|---------|-------------|
| Initial mount | `page=1`, `pageSize=10` → fetch |
| User changes page | `page` updates → fetch |
| User changes page size | `pageSize` updates → fetch |
| User types in filter | `debouncedFilters` updates → fetch |

## Why This Works

1. Initial state: `page=1`, `pageSize=10`, `isLoading=true`
2. Component mounts, useEffect runs, calls `search()`
3. `search()` calls `fetchData({ page, pageSize, filters })`
4. Results update `rows` state via `setRows`
5. `isLoading` set to false

## Pagination Flow

```
User clicks "Next Page"
    → setPage(2)
    → useEffect triggers
    → search() called
    → fetchData({ page: 2, pageSize: 10 })
    → rows updated
    → UI re-renders with new page
```

## Additional Context

The effect runs on every change to:
- `page` - current page number
- `pageSize` - rows per page (options: 5, 10, 20, 50)
- `debouncedFilters` - filter state after 300ms debounce

This ensures the table is always in sync with the current pagination and filter state.
