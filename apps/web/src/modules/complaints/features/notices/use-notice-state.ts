import { useMemo, useState } from 'react'
import type { SelectOption } from '@/shared/components/forms/select-field'
import { useForm } from '@/shared/hooks/use-form'
import { resolveNoticeUrl } from './notice-url'
import type { NoticeStoreOption } from './types'

export type Orientation = 'portrait' | 'landscape'
export type WidgetTheme = 'light' | 'dark'

interface NoticeFormValues {
	qrUrl: string | null
	selectedStore: SelectOption | null
}

function buildInitialValues(defaultQrUrl: string): NoticeFormValues {
	return {
		qrUrl: defaultQrUrl,
		selectedStore: null,
	}
}

export function useNoticeState(
	defaultQrUrl: string,
	stores: NoticeStoreOption[],
) {
	const [orientation, setOrientation] = useState<Orientation>('portrait')
	const [widgetTheme, setWidgetTheme] = useState<WidgetTheme>('light')

	const [formValues, setFormValues] = useState<NoticeFormValues>(() =>
		buildInitialValues(defaultQrUrl),
	)

	const { register } = useForm<NoticeFormValues>({
		values: formValues,
		setValues: setFormValues,
		initialValues: buildInitialValues(defaultQrUrl),
	})

	const storeOptions = useMemo<SelectOption[]>(
		() =>
			stores.map((store) => ({
				value: store.id,
				label: store.name,
			})),
		[stores],
	)

	const storeUrlById = useMemo(
		() => new Map(stores.map((store) => [store.id, store.url])),
		[stores],
	)

	const selectedStoreUrl = formValues.selectedStore
		? (storeUrlById.get(formValues.selectedStore.value) ?? null)
		: null

	const resolvedQrUrl = resolveNoticeUrl(selectedStoreUrl, defaultQrUrl)
	const qrUrl = resolveNoticeUrl(formValues.qrUrl, resolvedQrUrl)
	const isCustomUrl = qrUrl !== resolvedQrUrl

	const handleSelectedStoreChange = (selectedStore: SelectOption | null) => {
		setFormValues((previous) => ({
			...previous,
			selectedStore,
			qrUrl: selectedStore
				? (storeUrlById.get(selectedStore.value) ?? defaultQrUrl)
				: defaultQrUrl,
		}))
	}

	const clearSelectedStore = () => {
		handleSelectedStoreChange(null)
	}

	return {
		orientation,
		setOrientation,
		widgetTheme,
		setWidgetTheme,
		qrUrl,
		resolvedQrUrl,
		isCustomUrl,
		selectedStore: formValues.selectedStore,
		storeOptions,
		qrUrlFieldProps: register('qrUrl'),
		selectedStoreFieldProps: {
			...register('selectedStore'),
			value: formValues.selectedStore,
			onValueChange: handleSelectedStoreChange,
		},
		clearSelectedStore,
	}
}
