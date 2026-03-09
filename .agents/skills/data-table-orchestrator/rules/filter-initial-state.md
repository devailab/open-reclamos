# Define Initial Filter State

**Impact: MEDIUM (provides type safety for filters)**

Define initial filter state with proper typing. Use a separate types file for complex filter structures.

## Types File Pattern

Create a types file in the feature's `_features` folder:

```tsx
// src/app/app/(dashboard)/stores/_features/types.ts
export interface StoreFilters {
  name: string | null
  type: string | null
  district: { value: string; label: string } | null
  createdAtFrom: Date | null
  createdAtTo: Date | null
}

export const INITIAL_STORE_FILTERS: StoreFilters = {
  name: null,
  type: null,
  district: null,
  createdAtFrom: null,
  createdAtTo: null,
}
```

## Page Component Usage

```tsx
import { INITIAL_STORE_FILTERS, type StoreFilters } from './_features/types'

export default function StoresPage() {
  const [filters, setFilters] = useState<StoreFilters>(INITIAL_STORE_FILTERS)
  // ... rest of component
}
```

## Filter Field Types

Common filter field types:

| Type | Use Case |
|------|----------|
| `string \| null` | Text inputs, search fields |
| `{ value: string; label: string } \| null` | Select, Combobox selections |
| `Date \| null` | Date pickers |
| `string \| null` (with empty string check) | Multi-select arrays |

## Additional Context

Benefits of centralized filter types:
- Type safety across filters component and page
- Single source of truth for initial values
- Easy to add new filter fields
- Reusable across multiple components (filters UI, page, API calls)
