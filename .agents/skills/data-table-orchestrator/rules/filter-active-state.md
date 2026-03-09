# Compute Active Filters State

**Impact: MEDIUM (provides UI feedback for filter presence)**

Compute `hasActiveFilters` to show/hide filter clear buttons and update filter badge states.

## Implementation

```tsx
const hasActiveFilters = useMemo(() => {
  return Boolean(
    filters.name ||
      filters.type ||
      filters.district ||
      filters.createdAtFrom ||
      filters.createdAtTo,
  )
}, [filters])
```

## Usage in Filters Component

```tsx
<StoresFilters
  filters={filters}
  setFilters={setFilters}
  hasActiveFilters={hasActiveFilters}
  onSearch={handleSearch}
  onClear={handleClearFilters}
/>
```

## Usage in Page

```tsx
const hasActiveFilters = useMemo(() => {
  return Boolean(
    filters.name ||
      filters.type ||
      filters.district ||
      filters.createdAtFrom ||
      filters.createdAtTo,
  )
}, [filters])
```

## Common Patterns

### Show/Hide Clear Button

```tsx
{hasActiveFilters && (
  <Button variant='ghost' onClick={handleClearFilters}>
    Limpiar filtros
  </Button>
)}
```

### Filter Badge

```tsx
<div className='flex items-center gap-2'>
  <Button onClick={handleSearch}>Buscar</Button>
  {hasActiveFilters && (
    <Badge variant='secondary'>
      Filtros activos
    </Badge>
  )}
</div>
```

## Why useMemo

The computation is wrapped in `useMemo` because:
- Boolean logic on filter object is evaluated on every render
- Prevents unnecessary recalculations
- Performance optimization for filter-heavy pages

## Additional Context

Only include filterable fields in the check:
- Search text inputs
- Select/Combobox values
- Date range values

Exclude non-filtering fields like:
- Sort order (if managed separately)
- View mode toggles
