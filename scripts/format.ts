import { root, run } from './run'

await run([
	'bun',
	'x',
	'--no-install',
	'biome',
	'check',
	'--write',
	'apps/web',
	'packages',
	'scripts',
])

await run(
	[
		'go',
		'tool',
		'golines',
		'-w',
		'-m',
		'120',
		'cmd',
		'internal',
		'migrations',
	],
	`${root}/apps/api`,
)
