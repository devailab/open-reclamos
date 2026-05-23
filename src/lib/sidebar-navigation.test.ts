import { describe, expect, it } from 'bun:test'
import { canAccessSidebarPathname } from './sidebar-navigation'

describe('canAccessSidebarPathname', () => {
	it('allows dashboard for every authenticated user', () => {
		expect(canAccessSidebarPathname('/dashboard', [])).toBe(true)
	})

	it('keeps the current route when the new organization has permission', () => {
		expect(
			canAccessSidebarPathname('/dashboard/settings', ['settings.view']),
		).toBe(true)
	})

	it('redirects to dashboard when the new organization lacks the route permission', () => {
		expect(canAccessSidebarPathname('/dashboard/settings', [])).toBe(false)
	})

	it('keeps unknown resource routes so the page can resolve access itself', () => {
		expect(canAccessSidebarPathname('/dashboard/complaints/abc', [])).toBe(
			false,
		)
		expect(canAccessSidebarPathname('/dashboard/account', [])).toBe(true)
	})
})
