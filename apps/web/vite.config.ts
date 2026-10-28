import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
	const env = loadEnv(
		mode,
		fileURLToPath(new URL('../..', import.meta.url)),
		'',
	)
	const target =
		process.env.DEV_API_TARGET ||
		env.DEV_API_TARGET ||
		'http://127.0.0.1:8080'
	return {
		plugins: [react(), tailwindcss()],
		resolve: {
			alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
		},
		server: {
			host: '127.0.0.1',
			port: 5173,
			strictPort: true,
			proxy: Object.fromEntries(
				['/rpc', '/api', '/auth', '/mcp', '/health'].map((prefix) => [
					prefix,
					{ target },
				]),
			),
		},
		build: { target: 'es2022', sourcemap: false },
	}
})
