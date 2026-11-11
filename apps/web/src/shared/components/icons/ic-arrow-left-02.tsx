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
			<path d='M15 20.6695C14.81 20.6695 14.62 20.5995 14.47 20.4495L7.95003 13.9295C6.89003 12.8695 6.89003 11.1295 7.95003 10.0695L14.47 3.54953C14.76 3.25953 15.24 3.25953 15.53 3.54953C15.82 3.83953 15.82 4.31953 15.53 4.60953L9.01003 11.1295C8.53003 11.6095 8.53003 12.3895 9.01003 12.8695L15.53 19.3895C15.82 19.6795 15.82 20.1595 15.53 20.4495C15.38 20.5895 15.19 20.6695 15 20.6695Z' />
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
			<path d='M13.98 5.31975L10.77 8.52975L8.79999 10.4897C7.96999 11.3197 7.96999 12.6697 8.79999 13.4997L13.98 18.6797C14.66 19.3597 15.82 18.8697 15.82 17.9197V12.3097V6.07975C15.82 5.11975 14.66 4.63975 13.98 5.31975Z' />
		</svg>
	),
}

export function IcArrowLeft02(props: IconProps) {
	return renderIcon(props, variants)
}
