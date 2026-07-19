export const COMPLAINTS_BASE_PATH = '/dashboard/complaints'

// Debe coincidir con el nombre de la carpeta de la ruta:
// app/(dashboard)/dashboard/complaints/stores/[storeId]
export const COMPLAINTS_STORE_SEGMENT = 'stores'

const COMPLAINTS_STORE_PREFIX = `${COMPLAINTS_BASE_PATH}/${COMPLAINTS_STORE_SEGMENT}/`

export function buildComplaintsStorePath(storeId: string): string {
	return `${COMPLAINTS_STORE_PREFIX}${storeId}`
}

export function getComplaintsStoreIdFromPath(pathname: string): string | null {
	if (!pathname.startsWith(COMPLAINTS_STORE_PREFIX)) {
		return null
	}

	return pathname.slice(COMPLAINTS_STORE_PREFIX.length).split('/')[0] || null
}
