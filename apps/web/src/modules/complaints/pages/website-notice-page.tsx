import type { NoticeStoreOption } from '../features/notices/types'
import { useNoticeState } from '../features/notices/use-notice-state'
import { useNotices } from '../features/notices/use-notices'
import { WidgetPanel } from '../features/notices/widget-panel'

interface WebsitePageClientProps {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

function WebsitePageClient({ defaultQrUrl, stores }: WebsitePageClientProps) {
	const {
		widgetTheme,
		setWidgetTheme,
		qrUrl,
		isCustomUrl,
		selectedStore,
		storeOptions,
		qrUrlFieldProps,
		selectedStoreFieldProps,
		clearSelectedStore,
	} = useNoticeState(defaultQrUrl, stores)

	return (
		<WidgetPanel
			defaultQrUrl={defaultQrUrl}
			widgetUrl={qrUrl}
			isCustomUrl={isCustomUrl}
			selectedStore={selectedStore}
			storeOptions={storeOptions}
			qrUrlFieldProps={qrUrlFieldProps}
			selectedStoreFieldProps={selectedStoreFieldProps}
			onClearSelectedStore={clearSelectedStore}
			widgetTheme={widgetTheme}
			onWidgetThemeChange={setWidgetTheme}
		/>
	)
}

export function WebsiteNoticePage() {
	const { context, fallback } = useNotices()

	return context ? <WebsitePageClient {...context} /> : fallback
}
