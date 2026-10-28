import { run } from './run'

const steps = [
	{
		name: 'Lint (Biome)',
		command: [
			'bun',
			'x',
			'--no-install',
			'biome',
			'check',
			'apps/web',
			'packages',
			'scripts',
		],
	},
	{
		name: 'Tipos (raíz)',
		command: [
			'bun',
			'x',
			'--no-install',
			'tsc',
			'--noEmit',
			'-p',
			'tsconfig.json',
		],
	},
	{
		name: 'Tipos (web)',
		command: ['bun', 'run', '--cwd', 'apps/web', 'typecheck'],
	},
	{
		name: 'Lint (Go vet)',
		command: ['go', '-C', 'apps/api', 'vet', './...'],
	},
]

for (const step of steps) {
	console.info(`\n- ${step.name}`)

	await run(step.command)
}

console.info('\n✔ Todo en orden.')
