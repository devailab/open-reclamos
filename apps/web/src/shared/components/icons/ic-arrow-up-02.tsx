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
			<path d='M19.92 15.8001C19.73 15.8001 19.54 15.7301 19.39 15.5801L12.87 9.06008C12.39 8.58008 11.61 8.58008 11.13 9.06008L4.61002 15.5801C4.32002 15.8701 3.84002 15.8701 3.55002 15.5801C3.26002 15.2901 3.26002 14.8101 3.55002 14.5201L10.07 8.00008C11.13 6.94008 12.86 6.94008 13.93 8.00008L20.45 14.5201C20.74 14.8101 20.74 15.2901 20.45 15.5801C20.3 15.7201 20.11 15.8001 19.92 15.8001Z' />
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
			<path d='M18.6801 13.9802L15.4701 10.7702L13.5101 8.80023C12.6801 7.97023 11.3301 7.97023 10.5001 8.80023L5.32007 13.9802C4.64007 14.6602 5.13007 15.8202 6.08007 15.8202H11.6901H17.9201C18.8801 15.8202 19.3601 14.6602 18.6801 13.9802Z' />
		</svg>
	),
}

export function IcArrowUp02(props: IconProps) {
	return renderIcon(props, variants)
}
