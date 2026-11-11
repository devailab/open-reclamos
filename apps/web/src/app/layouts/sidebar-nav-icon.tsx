import type { IconComponent } from '@/shared/lib/render-icon'

export function SidebarNavIcon({
	icon: Icon,
	isActive,
	supportsSolid = true,
}: {
	icon: IconComponent
	isActive: boolean
	supportsSolid?: boolean
}) {
	if (!supportsSolid) {
		return <Icon />
	}

	return <Icon type={isActive ? 'solid' : 'outline'} />
}
