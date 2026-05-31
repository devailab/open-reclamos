import { pgSchema, text, uuid } from 'drizzle-orm/pg-core'

export const coreSchema = pgSchema('core')

export const countries = coreSchema.table('countries', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	name: text('name').notNull(),
	iso2: text('iso2').notNull().unique(),
	iso3: text('iso3').notNull().unique(),
	phoneCode: text('phone_code').notNull(),
	continent: text('continent').notNull(),
})

export const ubigeos = coreSchema.table('ubigeos', {
	id: uuid('id')
		.primaryKey()
		.$defaultFn(() => Bun.randomUUIDv7()),
	ubigeo: text('ubigeo').notNull().unique(),
	ubigeoReniec: text('ubigeo_reniec').unique(),
	department: text('department').notNull(),
	province: text('province').notNull(),
	district: text('district').notNull(),
	name: text('name').notNull(),
})
