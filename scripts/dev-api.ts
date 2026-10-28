import { mkdir } from 'node:fs/promises'
import { root, run } from './run'

await mkdir(`${root}/.cache`, { recursive: true })

await run(
	[
		'go',
		'build',
		'-o',
		`${root}/.cache/open-reclamos`,
		'./cmd/open-reclamos',
	],
	`${root}/apps/api`,
)

const args = [`${root}/.cache/open-reclamos`]

if (await Bun.file(`${root}/.env`).exists()) {
	args.push('--env-file', `${root}/.env`)
}

args.push('serve')

await run(args, `${root}/apps/api`)
