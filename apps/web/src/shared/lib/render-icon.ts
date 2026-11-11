import type { ComponentType, JSX, SVGProps as ReactSVGProps } from 'react'

export type SVGProps = Omit<ReactSVGProps<SVGSVGElement>, 'color' | 'type'>

export type IconProps = SVGProps & {
	type?: 'solid' | 'outline'
	color?: string
	size?: number
}

export type IconComponent = ComponentType<IconProps>

export interface IconRenderProps {
	color: string
	size: number
	props: SVGProps
}

export interface IconVariants {
	solid: (data: IconRenderProps) => JSX.Element
	outline: (data: IconRenderProps) => JSX.Element
}

export function renderIcon(
	{ type = 'outline', size = 24, color = 'currentColor', ...rest }: IconProps,
	variants: IconVariants,
) {
	const data: IconRenderProps = {
		color,
		size,
		props: {
			'aria-hidden':
				rest['aria-label'] || rest['aria-labelledby']
					? undefined
					: true,
			focusable: false,
			...rest,
		},
	}

	return variants[type](data)
}
