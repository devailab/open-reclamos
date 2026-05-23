'use client'

import { useMemo, useState } from 'react'
import type { SelectOption } from '@/components/forms/select-field'
import { useDebounce } from '@/hooks/use-debounce'
import { useForm } from '@/hooks/use-form'
import type { NoticeStoreOption } from '@/modules/notices/queries'

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
	const resolvedQrUrl = selectedStoreUrl ?? defaultQrUrl
	const qrUrl = formValues.qrUrl ?? defaultQrUrl
	const debouncedQrUrl = useDebounce(qrUrl, 600)
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
		debouncedQrUrl,
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
