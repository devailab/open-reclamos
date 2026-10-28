import { root, run } from './run'

const operation = process.argv[2]

if (operation !== 'migrate' && operation !== 'seed') {
	throw new Error('Operación de base de datos no válida.')
}

const command = ['go', 'run', './cmd/open-reclamos']

if (await Bun.file(`${root}/.env`).exists()) {
	command.push('--env-file', `${root}/.env`)
}

command.push(operation)

await run(command, `${root}/apps/api`)
