'use client'

import type { NoticeStoreOption } from '@/modules/notices/queries'
import { useNoticeState } from '../../_features/use-notice-state'
import { WidgetPanel } from '../../_features/widget-panel'

interface WebsitePageClientProps {
	defaultQrUrl: string
	stores: NoticeStoreOption[]
}

export function WebsitePageClient({
	defaultQrUrl,
	stores,
}: WebsitePageClientProps) {
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
