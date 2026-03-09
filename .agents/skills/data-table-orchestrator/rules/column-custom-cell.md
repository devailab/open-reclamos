# Implement Custom Cell Renderers

**Impact: HIGH (enables rich cell content)**

Implement custom cell renderers for formatted data, badges, actions, and complex layouts.

## Badge Cells

Use badges for status, types, and categorical data:

```tsx
{
  header: { render: () => 'Tipo' },
  cell: ({ row }) => (
    <Badge variant='secondary'>
      {row.type === 'physical' ? 'Fisica' : 'Virtual'}
    </Badge>
  ),
}
```

Available variants: `default`, `secondary`, `outline`, `destructive`

## Conditional Content

Render different content based on row data:

```tsx
{
  header: { render: () => 'Direccion / URL' },
  cell: ({ row }) => {
    if (row.type === 'physical') {
      const parts = [row.addressType, row.address]
        .filter(Boolean)
        .join(' ')
      return (
        <div className='flex items-center gap-1 text-sm text-muted-foreground'>
          <MapPin className='h-3.5 w-3.5 shrink-0' />
          {parts || '--'}
        </div>
      )
    }
    return (
      <div className='flex items-center gap-1 text-sm text-muted-foreground'>
        <Globe className='h-3.5 w-3.5 shrink-0' />
        {row.url ? (
          <a
            href={row.url}
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline truncate max-w-50'
          >
            {row.url}
          </a>
        ) : (
          '--'
        )}
      </div>
    )
  },
}
```

## Action Dropdowns

Implement action menus with DropdownMenu:

```tsx
{
  header: { render: () => 'Acciones' },
  cell: ({ row }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8'>
          <span className='sr-only'>Abrir acciones</span>
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleEdit(row)}>
          <Pencil className='mr-2 h-4 w-4' />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          onClick={() => handleDelete(row)}
        >
          <Trash2 className='mr-2 h-4 w-4' />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
```

## Formatting Utilities

Use formatters for dates and numbers:

```tsx
{
  header: { render: () => 'Fecha de registro' },
  cell: ({ row }) => (
    <div className='text-sm text-muted-foreground'>
      {formatDateDisplay(row.createdAt)}
    </div>
  ),
}
```

## Additional Context

Common patterns:
- Always include fallback content (`'--'`) for null/undefined values
- Use `text-muted-foreground` for secondary information
- Use icons with `shrink-0` to prevent layout shifts
- Wrap text content with truncation classes when needed
