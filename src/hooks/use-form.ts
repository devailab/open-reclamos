import type { Ref } from 'react'
import { useRef } from 'react'

export interface FormFieldProps<T> {
	value?: T
	onValueChange?: (value: T) => void
	validate?: (value: T) => string | null
	ref?: Ref<FormFieldRef>
}

export interface FormFieldRef {
	focus: () => void
	validate: () => string | null
}

export interface FormFieldError {
	field: string
	message: string
}

export interface UseFormParams<T> {
	values: T
	setValues: (updater: (prev: T) => T) => void
	initialValues?: T
}

interface ValidateOptions {
	focus?: 'first' | 'last' | false
}

// biome-ignore lint/suspicious/noExplicitAny: This is a generic form hook, it needs to be flexible with types.
export const useForm = <T extends Record<string, any>>({
	values,
	setValues,
	initialValues,
}: UseFormParams<T>) => {
	const fieldRefs = useRef(new Map<keyof T, FormFieldRef>())

	const register = <K extends keyof T>(field: K) => ({
		value: values[field],
		onValueChange: (value: T[K]) => {
			setValues((prev) => ({ ...prev, [field]: value }))
		},
		ref: (ref: FormFieldRef | null) => {
			if (ref) fieldRefs.current.set(field, ref)
			else fieldRefs.current.delete(field)
		},
	})

	const validate = (
		options: ValidateOptions = { focus: 'last' },
	): FormFieldError[] => {
		const errors: FormFieldError[] = []
		let firstRef: FormFieldRef | null = null
		let lastRef: FormFieldRef | null = null

		for (const [field, r] of fieldRefs.current) {
			const error = r?.validate()
			if (error) {
				errors.push({ field: field as string, message: error })
				if (!firstRef) {
					firstRef = r
				}
				lastRef = r
			}
		}

		if (options.focus === 'first') {
			firstRef?.focus()
		} else if (options.focus === 'last') {
			lastRef?.focus()
		}
		return errors
	}

	const reset = () => {
		if (initialValues) {
			setValues(() => ({ ...initialValues }))
		}
	}

	return { register, validate, reset }
}
