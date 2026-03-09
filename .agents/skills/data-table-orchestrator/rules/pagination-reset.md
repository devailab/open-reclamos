# Reset to Page 1 on Filter Changes

**Impact: MEDIUM (improves UX by resetting to first page)**

When applying new filters or clearing filters, reset to page 1 to avoid being on a page that no longer exists.

## Manual Search Trigger

```tsx
const handleSearch = () => {
  if (page !== 1) {
    setPage(1)
    return
  }
  search()
}
```

When user clicks "Search" button:
- If not on page 1 → set to page 1 (useEffect will trigger search)
- If already on page 1 → manually trigger search

## Clear Filters

```tsx
const handleClearFilters = () => {
  setFilters(INITIAL_FILTERS)
  if (page !== 1) {
    setPage(1)
  }
}
```

When clearing all filters:
- Reset filters to initial state
- If not on page 1 → set to page 1 (useEffect will trigger search)
- If already on page 1 → useEffect will trigger on filter change anyway

## Why Reset to Page 1

Scenario without reset:
- User is on page 5 of 50 results
- User applies a filter that returns only 10 results
- Page 5 no longer exists
- User sees empty table or error

Scenario with reset:
- User is on page 5
- User applies filter
- Automatically reset to page 1
- User sees first page of filtered results

## Flow Diagram

```
handleSearch() called
    │
    ▼
Is page !== 1?
    │
    ├── YES → setPage(1) → useEffect triggers → search()
    │
    └── NO  → search() called directly
```

## Additional Context

This pattern is essential for:
- Search buttons that should re-query immediately
- Clear filter buttons that should reset pagination
- Any action that changes the result set size
