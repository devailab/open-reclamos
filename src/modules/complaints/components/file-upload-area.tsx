'use client'

import {
	FileIcon,
	FileTextIcon,
	ImageIcon,
	Loader2,
	Paperclip,
	Trash2,
	UploadCloud,
	XCircle,
} from 'lucide-react'
import {
	type Dispatch,
	type FC,
	type SetStateAction,
	useCallback,
	useRef,
	useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UploadedFile {
	id: string
	key: string
	fileName: string
	contentType: string
	status: 'uploading' | 'done' | 'error'
	error?: string
}

interface FileUploadAreaProps {
	storeId: string
	files: UploadedFile[]
	onChange: Dispatch<SetStateAction<UploadedFile[]>>
	disabled?: boolean
	maxFiles?: number
}

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'application/pdf',
]

const FileTypeIcon = ({ contentType }: { contentType: string }) => {
	if (contentType === 'application/pdf') {
		return <FileTextIcon className='h-4 w-4 text-red-500' />
	}
	if (contentType.startsWith('image/')) {
		return <ImageIcon className='h-4 w-4 text-blue-500' />
	}
	return <FileIcon className='h-4 w-4 text-muted-foreground' />
}

export const FileUploadArea: FC<FileUploadAreaProps> = ({
	storeId,
	files,
	onChange,
	disabled,
	maxFiles = 5,
}) => {
	const inputRef = useRef<HTMLInputElement>(null)
	const [isDragging, setIsDragging] = useState(false)

	const uploadFile = useCallback(
		async (file: File) => {
			const id = crypto.randomUUID()
			onChange((prev) => [
				...prev,
				{
					id,
					key: '',
					fileName: file.name,
					contentType: file.type,
					status: 'uploading',
				},
			])

			try {
				const formData = new FormData()
				formData.append('file', file)
				formData.append('storeId', storeId)

				const res = await fetch('/api/complaints/upload', {
					method: 'POST',
					body: formData,
				})
				const data = await res.json()

				onChange((prev) =>
					prev.map((f) =>
						f.id === id
							? res.ok
								? { ...f, key: data.key, status: 'done' }
								: {
										...f,
										status: 'error',
										error: data.error ?? 'Error al subir',
									}
							: f,
					),
				)
			} catch {
				onChange((prev) =>
					prev.map((f) =>
						f.id === id
							? {
									...f,
									status: 'error',
									error: 'Error de conexión',
								}
							: f,
					),
				)
			}
		},
		[onChange, storeId],
	)

	const processFiles = useCallback(
		(fileList: FileList | null) => {
			if (!fileList) return
			const remaining = maxFiles - files.length
			if (remaining <= 0) return

			Array.from(fileList)
				.slice(0, remaining)
				.forEach((file) => {
					if (!ALLOWED_TYPES.includes(file.type)) return
					if (file.size > MAX_SIZE_MB * 1024 * 1024) return
					uploadFile(file)
				})
		},
		[files.length, maxFiles, uploadFile],
	)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragging(false)
			if (!disabled) processFiles(e.dataTransfer.files)
		},
		[disabled, processFiles],
	)

	const handleRemove = (id: string) => {
		onChange((prev) => prev.filter((f) => f.id !== id))
	}

	const triggerInput = () => {
		if (canAdd) inputRef.current?.click()
	}

	const canAdd = files.length < maxFiles && !disabled

	return (
		<div className='space-y-3'>
			{/* Drop zone */}
			<button
				type='button'
				disabled={!canAdd}
				onDragOver={(e) => {
					e.preventDefault()
					if (!disabled) setIsDragging(true)
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				onClick={triggerInput}
				className={cn(
					'relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
					canAdd
						? 'cursor-pointer hover:border-primary/50 hover:bg-muted/30'
						: 'cursor-not-allowed opacity-60',
					isDragging && 'border-primary bg-primary/5',
					!isDragging && 'border-border',
				)}
			>
				<input
					ref={inputRef}
					type='file'
					multiple
					accept={ALLOWED_TYPES.join(',')}
					className='sr-only'
					disabled={!canAdd}
					onChange={(e) => processFiles(e.target.files)}
				/>
				<UploadCloud className='mb-2 h-8 w-8 text-muted-foreground' />
				<p className='text-sm font-medium'>
					{isDragging
						? 'Suelta los archivos aquí'
						: 'Arrastra archivos o haz clic para seleccionar'}
				</p>
				<p className='mt-1 text-xs text-muted-foreground'>
					Imágenes o PDF · Máx. {MAX_SIZE_MB}MB por archivo ·{' '}
					{files.length}/{maxFiles} archivos
				</p>
			</button>

			{/* File list */}
			{files.length > 0 && (
				<ul className='space-y-2'>
					{files.map((f) => (
						<li
							key={f.id}
							className='flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2'
						>
							<FileTypeIcon contentType={f.contentType} />

							<span className='min-w-0 flex-1 truncate text-sm'>
								{f.fileName}
							</span>

							{f.status === 'uploading' && (
								<Loader2 className='h-4 w-4 animate-spin text-muted-foreground shrink-0' />
							)}
							{f.status === 'error' && (
								<span className='flex shrink-0 items-center gap-1 text-xs text-destructive'>
									<XCircle className='h-3.5 w-3.5' />
									{f.error}
								</span>
							)}
							{f.status === 'done' && (
								<Paperclip className='h-3.5 w-3.5 shrink-0 text-green-600' />
							)}

							<Button
								type='button'
								variant='ghost'
								size='icon-sm'
								onClick={() => handleRemove(f.id)}
								className='shrink-0 text-muted-foreground hover:text-destructive'
							>
								<Trash2 className='h-3.5 w-3.5' />
								<span className='sr-only'>Eliminar</span>
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
