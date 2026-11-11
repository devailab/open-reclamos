import {
	type IconProps,
	type IconVariants,
	renderIcon,
} from '@/shared/lib/render-icon'

const variants: IconVariants = {
	outline: ({ color, size, props }) => (
		<svg
			aria-hidden='true'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill={color}
			{...props}
		>
			<path d='M12 16.7996C11.3 16.7996 10.6 16.5296 10.07 15.9996L3.55002 9.47965C3.26002 9.18965 3.26002 8.70965 3.55002 8.41965C3.84002 8.12965 4.32002 8.12965 4.61002 8.41965L11.13 14.9396C11.61 15.4196 12.39 15.4196 12.87 14.9396L19.39 8.41965C19.68 8.12965 20.16 8.12965 20.45 8.41965C20.74 8.70965 20.74 9.18965 20.45 9.47965L13.93 15.9996C13.4 16.5296 12.7 16.7996 12 16.7996Z' />
		</svg>
	),
	solid: ({ color, size, props }) => (
		<svg
			aria-hidden='true'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill={color}
			{...props}
		>
			<path d='M17.92 8.17969H11.69H6.07999C5.11999 8.17969 4.63999 9.33969 5.31999 10.0197L10.5 15.1997C11.33 16.0297 12.68 16.0297 13.51 15.1997L15.48 13.2297L18.69 10.0197C19.36 9.33969 18.88 8.17969 17.92 8.17969Z' />
		</svg>
	),
}

export function IcArrowDown02(props: IconProps) {
	return renderIcon(props, variants)
}
