import type { Config } from 'drizzle-kit'

export default {
	dbCredentials: {
		connectionString: process.env.DATABASE_URL!,
	},
	driver: 'mysql2',
	schema: './src/drizzle/schema.ts'
} satisfies Config
