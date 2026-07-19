import type { NextConfig } from 'next'

const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"connect-src 'self' https: data: blob:",
	"worker-src 'self' blob:",
	"frame-src 'self' blob: https://challenges.cloudflare.com",
	"frame-ancestors 'self'",
	"base-uri 'self'",
	"form-action 'self'",
].join('; ')

const SECURITY_HEADERS = [
	{ key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{
		key: 'Permissions-Policy',
		value: 'camera=(), microphone=(), geolocation=()',
	},
]

const nextConfig: NextConfig = {
	reactCompiler: true,
	output: 'standalone',
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: SECURITY_HEADERS,
			},
		]
	},
}

export default nextConfig
