'use client'

import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer'

interface ResponsiveModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	children: React.ReactNode
	className?: string
}

export function ResponsiveModal({
	open,
	onOpenChange,
	title,
	description,
	children,
	className,
}: ResponsiveModalProps) {
	const isMobile = useIsMobile()
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) return null

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader className='text-left'>
						<DrawerTitle>{title}</DrawerTitle>
						{description && (
							<DrawerDescription>{description}</DrawerDescription>
						)}
					</DrawerHeader>
					<div className='overflow-y-auto px-4 pb-8'>{children}</div>
				</DrawerContent>
			</Drawer>
		)
	}

	return (
		<Dialog open={open} onOpenChange={(o) => onOpenChange(o)}>
			<DialogContent className={className}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && (
						<DialogDescription>{description}</DialogDescription>
					)}
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	)
}
