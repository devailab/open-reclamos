---
name: data-table-orchestrator
description: Data table orchestration patterns for building reusable, type-safe data tables with pagination and filtering. Use when implementing list pages with server-side data fetching, filter management, or table components.
---

# Data Table Orchestrator

Patterns for building scalable data tables with pagination and filtering using the `useDataTable` hook and `DataTable` component.

## When to Apply

Reference these guidelines when:

- Building list pages with server-side pagination
- Implementing filter/search functionality
- Defining type-safe column configurations

## Rule Categories by Priority

| Priority | Category            | Impact | Prefix          |
| -------- | ------------------- | ------ | --------------- |
| 1        | Hook Configuration  | HIGH   | `hook-`         |
| 2        | Column Definitions | HIGH   | `column-`       |
| 3        | Filter Management  | MEDIUM | `filter-`       |
| 4        | Pagination         | MEDIUM | `pagination-`  |

## Quick Reference

### 1. Hook Configuration (HIGH)

- `hook-use-datatable-init` - Initialize useDataTable with proper typing
- `hook-fetch-data-callback` - Create fetchData callback with filter mapping

### 2. Column Definitions (HIGH)

- `column-type-safe` - Define columns using defineColumns helper
- `column-custom-cell` - Implement custom cell renderers

### 3. Filter Management (MEDIUM)

- `filter-initial-state` - Define initial filter state with types
- `filter-debounced-sync` - Sync filters with debounce for server queries
- `filter-active-state` - Compute hasActiveFilters for UI feedback

### 4. Pagination (MEDIUM)

- `pagination-auto-fetch` - Auto-fetch on page/pageSize changes
- `pagination-reset` - Reset to page 1 on filter/search changes
