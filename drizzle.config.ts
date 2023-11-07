import type { Config } from 'drizzle-kit'

export default {
	dbCredentials: {
		connectionString: process.env.DATABASE_URL!,
	},
	driver: 'mysql2',
	introspect: {
		casing: 'camel'
	},
	schema: './src/drizzle/schema.ts',
	out: './src/drizzle',
	verbose: true
} satisfies Config
