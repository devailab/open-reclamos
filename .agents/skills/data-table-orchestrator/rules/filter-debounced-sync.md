# Sync Filters with Debounce

**Impact: HIGH (prevents excessive API calls)**

The `useDataTable` hook automatically provides `debouncedFilters` with a 300ms delay. Use this in `useEffect` to trigger searches automatically.

## Correct Implementation

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

// biome-ignore lint/correctness/useExhaustiveDependencies: search is not memoized
useEffect(() => {
  search()
}, [page, pageSize, debouncedFilters])
```

## How It Works

1. User changes filter (e.g., types in search input)
2. `setFilters` updates filter state immediately (UI updates)
3. `debouncedFilters` waits 300ms before updating
4. `useEffect` detects `debouncedFilters` change
5. `search()` is called with the debounced filters

## Why Use Debounce

Without debounce:
- User types "abc" (3 keystrokes)
- 3 API calls made: "a", "ab", "abc"

With debounce (300ms):
- User types "abc"
- Single API call made with "abc" after typing stops

## Biome Ignore Justification

```tsx
// biome-ignore lint/correctness/useExhaustiveDependencies: search is not memoized
```

The `search` function is intentionally not memoized because:
- It's created fresh each render
- Adding it to deps would cause infinite loops
- The effect only needs to run on pagination/filter changes
- The function is stable across renders due to internal fetchData being memoized with useCallback

## Additional Context

The debounce is implemented internally using `useDebounce` from `@/hooks/use-debounce`:

```tsx
const debouncedFilters = useDebounce(filters, 300)
```

This is provided automatically by the `useDataTable` hook.
