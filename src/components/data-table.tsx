import type { FC } from 'react'
import {
	type DataTableColumn,
	useDataTable,
	type useDataTableController,
} from '@/hooks/use-data-table'
import { cn } from '@/lib/utils'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
} from './ui/pagination'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'
import { Spinner } from './ui/spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from './ui/table'

export interface DataTableProps<T> {
	controller: ReturnType<typeof useDataTableController<T>>
	columns: DataTableColumn<T>[]
	rows: T[]
}

interface Person {
	id: string
	name: string
	age: number
}

const DataTable = <T,>({ controller, columns, rows }: DataTableProps<T>) => {
	const {
		store,
		handleRowClick,
		totalPages,
		hasNextPage,
		hasPreviousPage,
		setNextPage,
		setPreviousPage,
		isEnablePagination,
		isEnableRowSelection,
		handlePageSizeChange,
		isSelectRow,
	} = controller
	const isLoading = store.isLoading || false

	return (
		<div className='space-y-3'>
			<div className='overflow-x-auto'>
				<Table>
					<TableHeader>
						<TableRow className='border-none! bg-muted/65 hover:bg-muted/65'>
							{columns.map((column, index) => (
								<TableHead
									key={index}
									className='border-none! text-foreground/70'
								>
									{column.header.render()}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody className='relative'>
						{/* Loading */}
						{isLoading && !rows.length && (
							<TableRow>
								<TableCell colSpan={columns.length + 1}>
									<div className='flex justify-center'>
										<Spinner className='h-6' />
									</div>
								</TableCell>
							</TableRow>
						)}
						{/* Loading Overlay */}
						<TableRow>
							<TableCell
								colSpan={columns.length + 1}
								className='p-0'
							>
								<div
									className={cn(
										'absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/55 backdrop-blur-sm transition-opacity duration-300 ease-in-out',
										!(isLoading && !!rows.length)
											? 'opacity-0 pointer-events-none'
											: 'opacity-100',
									)}
								>
									<Spinner className='h-6' />
								</div>
							</TableCell>
						</TableRow>

						{/* Content */}
						{rows.length === 0 && !isLoading && (
							<TableRow>
								<TableCell
									colSpan={columns.length + 1}
									className='py-8 text-center text-muted-foreground'
								>
									No se encontraron registros
								</TableCell>
							</TableRow>
						)}
						{rows.map((row, index) => (
							<TableRow
								key={index}
								className={cn(
									'text-foreground border-border/50',
									isEnableRowSelection
										? 'cursor-pointer'
										: '',
									isSelectRow(row)
										? 'bg-primary/15 hover:bg-primary/20'
										: '',
								)}
								onClick={() => handleRowClick(row)}
							>
								{columns.map((column, idx) => (
									<TableCell key={idx}>
										{column.cell({ row: row }) ?? '--'}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Pagination Data */}
			{isEnablePagination && (
				<div className='flex flex-col gap-3 p-1 md:flex-row md:items-center md:justify-between'>
					<span className='flex items-center gap-1 text-sm font-bold'>
						Total de registros: {store.totalItems || 0}
					</span>
					<div className='grid items-center gap-3 md:grid-cols-[116px_74px_110px_auto]'>
						<span className='text-sm text-muted-foreground'>
							Filas por página
						</span>
						<Select
							onValueChange={(value) => {
								handlePageSizeChange(Number(value))
							}}
						>
							<SelectTrigger className='w-18'>
								<SelectValue placeholder={store.pageSize} />
							</SelectTrigger>
							<SelectContent>
								{[5, 10, 20, 50].map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<span className='text-sm text-muted-foreground'>
							Pag. {store.page || 1} de {totalPages}
						</span>
						<Pagination>
							<PaginationContent className='grid grid-cols-2 gap-2'>
								<PaginationItem
									className={`rounded-xl border ${
										!hasPreviousPage
											? 'cursor-not-allowed border-border/30 opacity-50'
											: 'border-border/80'
									}`}
								>
									<PaginationLink
										isActive={hasPreviousPage}
										onClick={() => setPreviousPage()}
										className='cursor-pointer'
									>
										{'<'}
									</PaginationLink>
								</PaginationItem>
								<PaginationItem
									className={`rounded-xl border ${
										!hasNextPage
											? 'cursor-not-allowed border-border/30 opacity-50'
											: 'border-border/80'
									}`}
								>
									<PaginationLink
										isActive={hasNextPage}
										onClick={() => setNextPage()}
										className='cursor-pointer'
									>
										{'>'}
									</PaginationLink>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</div>
			)}
		</div>
	)
}

export const ExampleUsageDataTable: FC = () => {
	const { controller, defineColumns } = useDataTable<Person>({
		getRowId: (row) => row.id,
	})

	const columns = defineColumns([
		{
			header: { render: () => 'Nombre' },
			cell: ({ row }) => row.name,
		},
		{
			header: { render: () => 'Edad' },
			cell: ({ row }) => row.age,
		},
	])

	return (
		<DataTable<Person>
			controller={controller}
			columns={columns}
			rows={[]}
		/>
	)
}

export default DataTable
