# Create fetchData Callback with Filter Mapping

**Impact: HIGH (bridges UI filters to server query parameters)**

Create a `fetchData` callback that maps filter state to server query parameters. This decouples the UI filter structure from the API contract.

## Incorrect

```tsx
const fetchStores = async ({ page, pageSize, filters }) => {
  return $getStores({
    page,
    pageSize,
    ...filters, // Exposes internal filter structure to API
  })
}
```

Problems:
- Exposes internal filter structure to API layer
- No control over parameter names sent to server
- Difficult to handle complex filter transformations

## Correct

```tsx
const fetchStores = useCallback(
  async ({
    page,
    pageSize,
    filters,
  }: {
    page: number
    pageSize: number
    filters?: StoreFilters
  }) => {
    return $getStores({
      page,
      pageSize,
      name: filters?.name ?? '',
      type: filters?.type || undefined,
      districtId: filters?.district?.value || undefined,
      createdAtFrom: formatDateForQuery(filters?.createdAtFrom ?? null),
      createdAtTo: formatDateForQuery(filters?.createdAtTo ?? null),
    })
  },
  [],
)
```

The callback should:
- Accept `{ page, pageSize, filters }` as parameters with explicit types
- Map UI filter values to API parameters explicitly
- Handle nullable values with defaults (`??`, `|| undefined`)
- Format date values using utility functions like `formatDateForQuery`
- Use `useCallback` to maintain referential equality

## Additional Context

Key mapping patterns:
- String filters: `filter?.field ?? ''` (empty string for undefined)
- Optional filters: `filter?.field || undefined` (omit if falsy)
- Object values: `filter?.field?.value || undefined` (extract value from select objects)
- Date filters: `formatDateForQuery(filter?.date ?? null)` (convert to ISO string)

This pattern is used in:
- `src/app/app/(dashboard)/stores/page.tsx` - stores fetchData
- `src/app/app/(dashboard)/reasons/page.tsx` - reasons fetchData
