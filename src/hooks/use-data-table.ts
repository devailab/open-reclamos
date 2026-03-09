import { useMemo, useState } from 'react'
import { useDebounce } from './use-debounce'

export interface DataTableStore {
	page: number
	pageSize: number
	totalItems: number
	isLoading: boolean
	setPage: (page: number) => void
	setPageSize: (pageSize: number) => void
	setTotalItems: (totalItems: number) => void
	setIsLoading: (isLoading: boolean) => void
}

export interface DataTableControllerProps<T> {
	store: DataTableStore
	getRowId?: (row: T) => string
	onRowClick?: (row: T) => void
	onSelectRow?: (row: T, selected: boolean) => void
	selectedRowIds?: Set<string>
	isEnablePagination?: boolean
	isEnableSorting?: boolean
	isEnableRowSelection?: boolean
}

export interface DataTableColumnHeader {
	render: () => React.ReactNode
	onSort?: () => void
}

export interface DataTableColumn<T> {
	header: DataTableColumnHeader
	cell: ({ row }: { row: T }) => React.ReactNode
}

export const defineDataTableColumns = <T>(columns: DataTableColumn<T>[]) => {
	return columns
}

export interface UseDataTableParams<T, F> {
	getRowId?: (row: T) => string
	setRows?: (rows: T[]) => void
	fetchData?: ({
		page,
		pageSize,
		filters,
	}: {
		page: number
		pageSize: number
		filters?: F
	}) => Promise<{ rows: T[]; totalItems: number; page?: number }>
	filters?: F
	setFilters?: (filters: F) => void
	onRowClick?: (row: T) => void
	onSelectRow?: (row: T, selected: boolean) => void
	selectedRowIds?: Set<string>
	isEnablePagination?: boolean
	isEnableSorting?: boolean
	isEnableRowSelection?: boolean
}

// biome-ignore lint/suspicious/noExplicitAny: Is necessary to allow flexibility in filter types
export const useDataTable = <T, F = any>({
	getRowId,
	setRows,
	fetchData,
	filters,
	setFilters,
	onRowClick,
	onSelectRow,
	selectedRowIds,
	isEnablePagination = true,
	isEnableSorting = false,
	isEnableRowSelection = false,
}: UseDataTableParams<T, F>) => {
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [totalItems, setTotalItems] = useState(0)
	const [isLoading, setIsLoading] = useState(true)

	const debouncedFilters = useDebounce(filters, 300)

	const search = async () => {
		if (!fetchData) return

		setIsLoading(true)
		try {
			const {
				rows,
				totalItems: fetchedTotalItems,
				page: currentPage,
			} = await fetchData({
				page,
				pageSize,
				filters,
			})
			setRows?.(rows)
			setTotalItems(fetchedTotalItems)
			if (currentPage) {
				setPage(currentPage)
			}
		} finally {
			setIsLoading(false)
		}
	}

	const controller = useDataTableController<T>({
		store: {
			page,
			pageSize,
			totalItems,
			isLoading,
			setPage,
			setPageSize,
			setTotalItems,
			setIsLoading,
		},
		getRowId,
		onRowClick,
		onSelectRow,
		selectedRowIds,
		isEnablePagination,
		isEnableSorting,
		isEnableRowSelection,
	})

	return {
		controller,
		defineColumns: defineDataTableColumns<T>,
		page,
		setPage,
		pageSize,
		setPageSize,
		totalItems,
		setTotalItems,
		isLoading,
		setIsLoading,
		search,
		filters,
		setFilters,
		debouncedFilters,
	}
}

export const useDataTableController = <T>({
	store,
	getRowId,
	onRowClick,
	onSelectRow,
	selectedRowIds,
	isEnablePagination = true,
	isEnableSorting = false,
	isEnableRowSelection = false,
}: DataTableControllerProps<T>) => {
	const totalPages = Math.ceil(
		(store?.totalItems || 0) / (store?.pageSize || 1),
	)

	const hasNextPage = useMemo(() => {
		if (!store) return false
		return store.page < totalPages
	}, [store, totalPages])

	const hasPreviousPage = useMemo(() => {
		if (!store) return false
		return store.page > 1
	}, [store])

	const setNextPage = () => {
		if (store && hasNextPage) {
			store.setPage(store.page + 1)
		}
	}

	const setPreviousPage = () => {
		if (store && hasPreviousPage) {
			store.setPage(store.page - 1)
		}
	}

	const isSelectRow = (row: T): boolean => {
		if (!getRowId || !selectedRowIds) return false
		const rowId = getRowId(row)
		return selectedRowIds.has(rowId)
	}

	const handleRowClick = (row: T) => {
		if (onRowClick) {
			onRowClick(row)
		}

		if (isEnableRowSelection && onSelectRow && getRowId) {
			const selected = isSelectRow(row)
			onSelectRow(row, !selected)
		}
	}

	const handlePageSizeChange = (newPageSize: number) => {
		if (store) {
			store.setPageSize(newPageSize)
			store.setPage(1)
		}
	}

	return {
		store,
		getRowId,
		handleRowClick,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		setNextPage,
		setPreviousPage,
		isEnablePagination,
		isEnableSorting,
		isEnableRowSelection,
		handlePageSizeChange,
		isSelectRow,
	}
}
