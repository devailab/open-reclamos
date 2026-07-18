import { describe, expect, it } from 'bun:test'
import { isPrivateIp, validateWebhookUrlSyntax } from './url-validation'

describe('isPrivateIp', () => {
	it('detecta rangos privados y especiales IPv4', () => {
		for (const ip of [
			'127.0.0.1',
			'10.0.0.5',
			'172.16.0.1',
			'172.31.255.255',
			'192.168.1.1',
			'169.254.169.254',
			'100.64.0.1',
			'0.0.0.0',
			'224.0.0.1',
			'255.255.255.255',
		]) {
			expect(isPrivateIp(ip)).toBe(true)
		}
	})

	it('acepta IPs públicas IPv4', () => {
		for (const ip of ['8.8.8.8', '1.1.1.1', '52.84.1.10']) {
			expect(isPrivateIp(ip)).toBe(false)
		}
	})

	it('detecta rangos privados IPv6', () => {
		for (const ip of ['::1', '::', 'fc00::1', 'fd12::1', 'fe80::1']) {
			expect(isPrivateIp(ip)).toBe(true)
		}
	})

	it('detecta IPv4 privada embebida en IPv6', () => {
		expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true)
		expect(isPrivateIp('::ffff:192.168.0.1')).toBe(true)
	})

	it('acepta IPv6 pública', () => {
		expect(isPrivateIp('2606:4700:4700::1111')).toBe(false)
	})
})

describe('validateWebhookUrlSyntax', () => {
	it('acepta URLs https públicas', () => {
		expect(
			validateWebhookUrlSyntax('https://example.com/webhook'),
		).toBeNull()
	})

	it('rechaza protocolos no http(s)', () => {
		expect(validateWebhookUrlSyntax('ftp://example.com')).not.toBeNull()
		expect(validateWebhookUrlSyntax('file:///etc/passwd')).not.toBeNull()
	})

	it('rechaza localhost y hosts internos', () => {
		expect(validateWebhookUrlSyntax('http://localhost:3000')).not.toBeNull()
		expect(
			validateWebhookUrlSyntax('http://api.internal/hook'),
		).not.toBeNull()
		expect(
			validateWebhookUrlSyntax('http://foo.localhost/hook'),
		).not.toBeNull()
	})

	it('rechaza IPs literales privadas', () => {
		expect(validateWebhookUrlSyntax('http://127.0.0.1/')).not.toBeNull()
		expect(validateWebhookUrlSyntax('http://10.0.0.1/hook')).not.toBeNull()
		expect(
			validateWebhookUrlSyntax('http://169.254.169.254/latest/meta-data'),
		).not.toBeNull()
		expect(validateWebhookUrlSyntax('http://[::1]/hook')).not.toBeNull()
	})

	it('rechaza URLs malformadas', () => {
		expect(validateWebhookUrlSyntax('no-es-url')).not.toBeNull()
	})
})
