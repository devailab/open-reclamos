import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('..', import.meta.url)).replace(
	/\/$/,
	'',
)

export async function run(command: string[], cwd = root, env = process.env) {
	const child = Bun.spawn(command, {
		cwd,
		env,
		stdout: 'inherit',
		stderr: 'inherit',
	})

	const interrupt = () => child.kill('SIGINT')
	const terminate = () => child.kill('SIGTERM')

	process.on('SIGINT', interrupt)
	process.on('SIGTERM', terminate)

	let code: number
	try {
		code = await child.exited
	} finally {
		process.off('SIGINT', interrupt)
		process.off('SIGTERM', terminate)
	}
	if (code !== 0) {
		throw new Error(`Falló el comando ${command[0]} (código ${code}).`)
	}
}
