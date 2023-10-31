import type { Config } from 'drizzle-kit'

export default {
	dbCredentials: {
		connectionString: process.env.DATABASE_URL!,
	},
	driver: 'mysql2',
	schema: './drizzle/schema.ts'
} satisfies Config
