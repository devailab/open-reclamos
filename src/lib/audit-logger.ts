import postgres, { type Sql } from 'postgres'
import { DATABASE_URL } from '@/lib/config'

type JsonPrimitive = string | number | boolean | null

export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue }

export interface AuditLogInput {
	id?: string
	organizationId?: string | null
	userId?: string | null
	action: string
	entityType: string
	entityId?: string | null
	oldData?: JsonValue | null
	newData?: JsonValue | null
	description?: string | null
	ipAddress?: string | null
	userAgent?: string | null
	createdAt?: Date
}

export interface AuditLogRecord extends AuditLogInput {
	id: string
	createdAt: Date
}

export interface AuditLogFilters {
	organizationId?: string | null
	action?: string | null
	entityType?: string | null
	entityId?: string | null
	userId?: string | null
	createdAtStart?: Date | string | null
	createdAtEnd?: Date | string | null
}

export interface AuditLogPaginatedInput {
	page: number
	pageSize: number
	filters?: AuditLogFilters
}

export interface AuditLogPaginatedResult {
	items: AuditLogRecord[]
	page: number
	pageSize: number
	total: number
	totalPages: number
}

export interface AuditLoggerOptions {
	connectionString?: string | URL
	sql?: Sql
	schemaName?: string
	tableName?: string
	onBackgroundError?: (error: unknown) => void
}

export type AuditLoggerInput = AuditLoggerOptions | string | URL

interface AuditLogRow {
	id: string
	organizationId: string | null
	userId: string | null
	action: string
	entityType: string
	entityId: string | null
	oldData: JsonValue | null
	newData: JsonValue | null
	description: string | null
	ipAddress: string | null
	userAgent: string | null
	createdAt: Date | string
}

const DEFAULT_SCHEMA_NAME = 'audit'
const DEFAULT_TABLE_NAME = 'audit_logs'

function assertIdentifier(identifier: string, label: string): string {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
		throw new Error(`Invalid ${label}: "${identifier}"`)
	}

	return identifier
}

function toQualifiedName(schemaName: string, tableName: string): string {
	return `${schemaName}.${tableName}`
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier}"`
}

function quoteQualifiedName(qualifiedName: string): string {
	return qualifiedName
		.split('.')
		.map((identifier) => quoteIdentifier(identifier))
		.join('.')
}

function toTimestampTzLiteral(date: Date): string {
	return `'${date.toISOString()}'::timestamptz`
}

function isDefinedFilterValue<T>(
	value: T | null | undefined,
): value is Exclude<T, null | undefined> {
	return value !== null && value !== undefined
}

function normalizeDateInput(
	value: Date | string | null | undefined,
	label: string,
): Date | null {
	if (!isDefinedFilterValue(value)) {
		return null
	}

	const normalizedDate = value instanceof Date ? value : new Date(value)

	if (Number.isNaN(normalizedDate.getTime())) {
		throw new Error(`Invalid ${label}`)
	}

	return normalizedDate
}

function getUtcYear(date: Date): number {
	return date.getUTCFullYear()
}

function isLastUtcDayOfYear(date: Date): boolean {
	return date.getUTCMonth() === 11 && date.getUTCDate() === 31
}

function getYearStartUtc(year: number): Date {
	return new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
}

function getYearEndUtc(year: number): Date {
	return new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0))
}

function buildLockNamespace(input: string): number {
	let hash = 0

	for (let index = 0; index < input.length; index += 1) {
		hash = (hash * 31 + input.charCodeAt(index)) | 0
	}

	return Math.abs(hash) || 1
}

function buildIndexName(tableName: string, suffix: string): string {
	return assertIdentifier(`${tableName}_${suffix}`, 'index name')
}

function mapAuditLogRow(row: AuditLogRow): AuditLogRecord {
	return {
		id: row.id,
		organizationId: row.organizationId,
		userId: row.userId,
		action: row.action,
		entityType: row.entityType,
		entityId: row.entityId,
		oldData: row.oldData,
		newData: row.newData,
		description: row.description,
		ipAddress: row.ipAddress,
		userAgent: row.userAgent,
		createdAt:
			row.createdAt instanceof Date
				? row.createdAt
				: new Date(row.createdAt),
	}
}

export class AuditLogger {
	private readonly sql: Sql
	private readonly ownsConnection: boolean
	private readonly schemaName: string
	private readonly tableName: string
	private readonly qualifiedTableName: string
	private readonly lockNamespace: number
	private readonly onBackgroundError?: (error: unknown) => void
	private readonly readyYears = new Set<number>()
	private readonly partitionPromises = new Map<number, Promise<void>>()
	private readonly nextYearWarmupPromises = new Map<number, Promise<void>>()
	private cachedCurrentYear = getUtcYear(new Date())
	private baseSetupCompleted = false
	private baseSetupPromise: Promise<void> | null = null

	constructor(options: AuditLoggerInput = {}) {
		const normalizedOptions =
			typeof options === 'string' || options instanceof URL
				? { connectionString: options }
				: options

		this.sql =
			normalizedOptions.sql ??
			(normalizedOptions.connectionString
				? postgres(normalizedOptions.connectionString.toString())
				: postgres())
		this.ownsConnection = !normalizedOptions.sql
		this.schemaName = assertIdentifier(
			normalizedOptions.schemaName ?? DEFAULT_SCHEMA_NAME,
			'schema name',
		)
		this.tableName = assertIdentifier(
			normalizedOptions.tableName ?? DEFAULT_TABLE_NAME,
			'table name',
		)
		this.qualifiedTableName = toQualifiedName(
			this.schemaName,
			this.tableName,
		)
		this.lockNamespace = buildLockNamespace(this.qualifiedTableName)
		this.onBackgroundError = normalizedOptions.onBackgroundError
	}

	async ensureReady(date = new Date()): Promise<void> {
		await this.ensureBaseSetup()
		await this.ensurePartitionForYear(getUtcYear(date))
	}

	async insert(input: AuditLogInput): Promise<AuditLogRecord> {
		const createdAt = input.createdAt ?? new Date()
		const partitionYear = getUtcYear(createdAt)

		if (!this.baseSetupCompleted) {
			await this.ensureReady(createdAt)
		} else if (
			partitionYear !== this.cachedCurrentYear &&
			!this.readyYears.has(partitionYear)
		) {
			await this.ensurePartitionForYear(partitionYear)
		}

		const record: Required<AuditLogInput> = {
			id: input.id ?? Bun.randomUUIDv7(),
			organizationId: input.organizationId ?? null,
			userId: input.userId ?? null,
			action: input.action,
			entityType: input.entityType,
			entityId: input.entityId ?? null,
			oldData: input.oldData ?? null,
			newData: input.newData ?? null,
			description: input.description ?? null,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
			createdAt,
		}

		await this.sql.unsafe(
			`
				INSERT INTO ${quoteQualifiedName(this.qualifiedTableName)} (
					id,
					organization_id,
					user_id,
					action,
					entity_type,
					entity_id,
					old_data,
					new_data,
					description,
					ip_address,
					user_agent,
					created_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
				)
			`,
			[
				record.id,
				record.organizationId,
				record.userId,
				record.action,
				record.entityType,
				record.entityId,
				record.oldData === null ? null : JSON.stringify(record.oldData),
				record.newData === null ? null : JSON.stringify(record.newData),
				record.description,
				record.ipAddress,
				record.userAgent,
				record.createdAt,
			],
		)

		this.maybePrewarmNextYear(createdAt, partitionYear)

		return {
			...record,
			createdAt: record.createdAt,
		}
	}

	async getById(id: string): Promise<AuditLogRecord | null> {
		await this.ensureBaseSetup()

		const query = `
			SELECT
				id,
				organization_id AS "organizationId",
				user_id AS "userId",
				action,
				entity_type AS "entityType",
				entity_id AS "entityId",
				old_data AS "oldData",
				new_data AS "newData",
				description,
				ip_address AS "ipAddress",
				user_agent AS "userAgent",
				created_at AS "createdAt"
			FROM ${quoteQualifiedName(this.qualifiedTableName)}
			WHERE id = $1
			ORDER BY created_at DESC
			LIMIT 1
		`

		const [row] = await this.sql.unsafe<AuditLogRow[]>(query, [id])
		return row ? mapAuditLogRow(row) : null
	}

	async getPaginated(
		input: AuditLogPaginatedInput,
	): Promise<AuditLogPaginatedResult> {
		await this.ensureBaseSetup()

		const page = Number.isFinite(input.page) ? Math.trunc(input.page) : 0
		const pageSize = Number.isFinite(input.pageSize)
			? Math.trunc(input.pageSize)
			: 0

		if (page < 1) {
			throw new Error('Page must be greater than 0')
		}

		if (pageSize < 1) {
			throw new Error('Page size must be greater than 0')
		}

		const { whereClause, values } = this.buildFilterWhereClause(
			input.filters,
		)
		const offset = (page - 1) * pageSize

		const listQuery = `
			SELECT
				id,
				organization_id AS "organizationId",
				user_id AS "userId",
				action,
				entity_type AS "entityType",
				entity_id AS "entityId",
				old_data AS "oldData",
				new_data AS "newData",
				description,
				ip_address AS "ipAddress",
				user_agent AS "userAgent",
				created_at AS "createdAt"
			FROM ${quoteQualifiedName(this.qualifiedTableName)}
			${whereClause}
			ORDER BY created_at DESC, id DESC
			LIMIT $${values.length + 1}
			OFFSET $${values.length + 2}
		`
		const countQuery = `
			SELECT COUNT(*)::int AS total
			FROM ${quoteQualifiedName(this.qualifiedTableName)}
			${whereClause}
		`

		const [rows, countRows] = await Promise.all([
			this.sql.unsafe<AuditLogRow[]>(listQuery, [
				...values,
				pageSize,
				offset,
			]),
			this.sql.unsafe<{ total: number }[]>(countQuery, values),
		])

		const total = countRows[0]?.total ?? 0

		return {
			items: rows.map(mapAuditLogRow),
			page,
			pageSize,
			total,
			totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
		}
	}

	async close(options?: { timeout?: number }): Promise<void> {
		if (!this.ownsConnection) {
			return
		}

		await this.sql.end(options)
	}

	private async ensureBaseSetup(): Promise<void> {
		if (this.baseSetupCompleted) {
			return
		}

		if (this.baseSetupPromise) {
			return this.baseSetupPromise
		}

		this.baseSetupPromise = (async () => {
			await this.sql.begin(async (tx) => {
				await tx.unsafe(
					`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schemaName)}`,
				)

				await tx.unsafe(`
					CREATE TABLE IF NOT EXISTS ${quoteQualifiedName(this.qualifiedTableName)} (
						id uuid NOT NULL,
						organization_id uuid,
						user_id uuid,
						action text NOT NULL,
						entity_type text NOT NULL,
						entity_id uuid,
						old_data jsonb,
						new_data jsonb,
						description text,
						ip_address text,
						user_agent text,
						created_at timestamptz NOT NULL DEFAULT now(),
						PRIMARY KEY (id, created_at)
					) PARTITION BY RANGE (created_at)
				`)

				await tx.unsafe(
					`ALTER TABLE ${quoteQualifiedName(this.qualifiedTableName)} DROP CONSTRAINT IF EXISTS ${quoteIdentifier(`${this.tableName}_organization_id_fkey`)}`,
				)
				await tx.unsafe(
					`ALTER TABLE ${quoteQualifiedName(this.qualifiedTableName)} DROP CONSTRAINT IF EXISTS ${quoteIdentifier(`${this.tableName}_user_id_fkey`)}`,
				)

				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'organization_id_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (organization_id)`,
				)
				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'created_at_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (created_at)`,
				)
				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'action_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (action)`,
				)
				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'entity_type_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (entity_type)`,
				)
				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'entity_id_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (entity_id)`,
				)
				await tx.unsafe(
					`CREATE INDEX IF NOT EXISTS ${quoteIdentifier(buildIndexName(this.tableName, 'organization_created_at_idx'))} ON ${quoteQualifiedName(this.qualifiedTableName)} (organization_id, created_at)`,
				)
			})

			this.baseSetupCompleted = true
		})()
			.catch((error) => {
				this.baseSetupPromise = null
				throw error
			})
			.finally(() => {
				if (this.baseSetupCompleted) {
					this.baseSetupPromise = null
				}
			})

		return this.baseSetupPromise
	}

	private async ensurePartitionForYear(year: number): Promise<void> {
		if (this.readyYears.has(year)) {
			this.cachedCurrentYear = year
			return
		}

		const existingPromise = this.partitionPromises.get(year)
		if (existingPromise) {
			return existingPromise
		}

		const promise = (async () => {
			await this.ensureBaseSetup()

			const partitionTableName = assertIdentifier(
				`${this.tableName}_${year}`,
				'partition table name',
			)
			const qualifiedPartitionTableName = toQualifiedName(
				this.schemaName,
				partitionTableName,
			)

			await this.sql.begin(async (tx) => {
				await tx`SELECT pg_advisory_xact_lock(${this.lockNamespace}, ${year})`

				const [partition] = await tx<{ regclass: string | null }[]>`
					SELECT to_regclass(${qualifiedPartitionTableName}) AS regclass
				`

				if (!partition?.regclass) {
					await tx.unsafe(`
						CREATE TABLE IF NOT EXISTS ${quoteQualifiedName(qualifiedPartitionTableName)}
						PARTITION OF ${quoteQualifiedName(this.qualifiedTableName)}
						FOR VALUES FROM (${toTimestampTzLiteral(getYearStartUtc(year))}) TO (${toTimestampTzLiteral(getYearEndUtc(year))})
					`)
				}
			})

			this.readyYears.add(year)
			this.cachedCurrentYear = year
		})().finally(() => {
			this.partitionPromises.delete(year)
		})

		this.partitionPromises.set(year, promise)
		return promise
	}

	private maybePrewarmNextYear(createdAt: Date, currentYear: number): void {
		if (!isLastUtcDayOfYear(createdAt)) {
			return
		}

		const nextYear = currentYear + 1

		if (
			this.readyYears.has(nextYear) ||
			this.nextYearWarmupPromises.has(nextYear)
		) {
			return
		}

		const warmupPromise = this.ensurePartitionForYear(nextYear)
			.catch((error) => {
				this.onBackgroundError?.(error)
			})
			.finally(() => {
				this.nextYearWarmupPromises.delete(nextYear)
			})

		this.nextYearWarmupPromises.set(nextYear, warmupPromise)
	}

	private buildFilterWhereClause(filters?: AuditLogFilters): {
		whereClause: string
		values: Array<string | Date>
	} {
		if (!filters) {
			return { whereClause: '', values: [] }
		}

		const conditions: string[] = []
		const values: Array<string | Date> = []

		const pushCondition = (sqlCondition: string, value: string | Date) => {
			values.push(value)
			conditions.push(`${sqlCondition} $${values.length}`)
		}

		if (isDefinedFilterValue(filters.organizationId)) {
			pushCondition('organization_id =', filters.organizationId)
		}

		if (isDefinedFilterValue(filters.action)) {
			pushCondition('action =', filters.action)
		}

		if (isDefinedFilterValue(filters.entityType)) {
			pushCondition('entity_type =', filters.entityType)
		}

		if (isDefinedFilterValue(filters.entityId)) {
			pushCondition('entity_id =', filters.entityId)
		}

		if (isDefinedFilterValue(filters.userId)) {
			pushCondition('user_id =', filters.userId)
		}

		const createdAtStart = normalizeDateInput(
			filters.createdAtStart,
			'createdAtStart',
		)
		if (createdAtStart) {
			pushCondition('created_at >=', createdAtStart)
		}

		const createdAtEnd = normalizeDateInput(
			filters.createdAtEnd,
			'createdAtEnd',
		)
		if (createdAtEnd) {
			pushCondition('created_at <=', createdAtEnd)
		}

		return {
			whereClause:
				conditions.length > 0
					? `WHERE ${conditions.join(' AND ')}`
					: '',
			values,
		}
	}
}

let _auditLogger: AuditLogger | undefined

function getAuditLoggerInstance(): AuditLogger {
	if (!_auditLogger) {
		_auditLogger = new AuditLogger({
			connectionString: process.env.AUDIT_DATABASE_URL ?? DATABASE_URL,
			onBackgroundError: (error) => {
				console.error('[audit] Error en prewarm de partición:', error)
			},
		})
	}
	return _auditLogger
}

export const auditLogger = new Proxy({} as AuditLogger, {
	get(_, prop) {
		const instance = getAuditLoggerInstance()
		const value = Reflect.get(instance, prop)
		return typeof value === 'function' ? value.bind(instance) : value
	},
})
