import { cp, mkdir, rm } from 'node:fs/promises'
import { root, run } from './run'

const web = `${root}/apps/web/dist`
const embedded = `${root}/apps/api/internal/shared/assets/web`
const version = process.env.RELEASE_VERSION || 'dev'

if (!/^[a-zA-Z0-9._+-]+$/.test(version)) {
	throw new Error('RELEASE_VERSION no es válida.')
}

console.info('\n- Frontend (Vite)')
await run(['bun', 'run', '--cwd', 'apps/web', 'build'])

if (!(await Bun.file(`${web}/index.html`).exists())) {
	throw new Error('No existe un build web válido.')
}

// go:embed empaqueta esta carpeta dentro del binario.
console.info('\n- Frontend embebido en el binario')
await rm(embedded, { recursive: true, force: true })
await cp(web, embedded, { recursive: true })
await Bun.write(`${embedded}/.gitkeep`, '')

console.info('\n- Binario (Go)')
await mkdir(`${root}/dist`, { recursive: true })

await run(
	[
		'go',
		'build',
		'-trimpath',
		'-ldflags',
		`-s -w -X main.version=${version}`,
		'-o',
		`${root}/dist/open-reclamos`,
		'./cmd/open-reclamos',
	],
	`${root}/apps/api`,
	{ ...process.env, CGO_ENABLED: '0' },
)

console.info('\n✔ Binario generado en dist/open-reclamos')
