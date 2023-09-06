import '@sapphire/plugin-api/register'
import '@sapphire/plugin-i18next/register'
import '@sapphire/plugin-logger/register'
import '@sapphire/plugin-scheduled-tasks/register'
import '@sapphire/plugin-utilities-store/register'
import { env, UserClient } from './lib'
import { container } from '@sapphire/framework'
import type { InternationalizationClientOptions, InternationalizationHandler } from '@sapphire/plugin-i18next'

( async () => {
	const client = new UserClient()
	try {
		await client.login( env.DISCORD_TOKEN )
	} catch ( e ) {
		container.logger.error( e )
		await client.destroy()
		process.exit( 1 )
	}
} )()
	.catch( e => container.logger.error( e ) )

declare module '@sapphire/pieces' {
	interface Container {
		i18n: InternationalizationHandler;
	}
}

declare module 'discord.js' {
	export interface ClientOptions extends InternationalizationClientOptions {}
}
