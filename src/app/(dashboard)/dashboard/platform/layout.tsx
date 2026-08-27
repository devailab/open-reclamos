import type { FC, PropsWithChildren } from 'react'
import { requirePlatformAdminPage } from '@/modules/platform/access'

// Guard único de toda la sección: las páginas hijas no repiten la validación.
const PlatformLayout: FC<PropsWithChildren> = async ({ children }) => {
	await requirePlatformAdminPage()

	return <>{children}</>
}

export default PlatformLayout
