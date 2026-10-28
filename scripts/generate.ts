import { root, run } from './run'

const api = `${root}/apps/api`

// Los generadores se ejecutan en el host, aunque el binario apunte a otro OS.
async function hostEnvironment() {
	const detect = Bun.spawn(['go', 'env', 'GOHOSTOS', 'GOHOSTARCH'], {
		stdout: 'pipe',
		stderr: 'inherit',
	})
	const [goos, goarch] = (await new Response(detect.stdout).text())
		.trim()
		.split(/\s+/)

	if ((await detect.exited) !== 0 || !goos || !goarch) {
		throw new Error(
			'No se pudo detectar la plataforma de las herramientas Go.',
		)
	}

	return { ...process.env, GOOS: goos, GOARCH: goarch }
}

const env = await hostEnvironment()

console.info('\n- Dependencias de Go')
await run(['go', '-C', 'apps/api', 'mod', 'download', 'all'])

console.info('\n- Lint de los .proto')
await run(['bun', 'x', '--no-install', 'buf', 'lint'])

console.info('\n- Código Go y TypeScript desde los .proto')
await run(['bun', 'x', '--no-install', 'buf', 'generate'], root, env)

console.info('\n- Constantes públicas desde Go')
await run(
	[
		'go',
		'run',
		'./tools/webconstants',
		'../../packages/rpc-client/src/gen/constants.ts',
	],
	api,
	env,
)

// Mismo formato para el cliente generado, sin editar su contrato a mano.
console.info('\n- Formato del cliente generado')
await run([
	'bun',
	'x',
	'--no-install',
	'biome',
	'format',
	'--write',
	'packages/rpc-client/src/gen',
])

console.info('\n✔ Generado.')
