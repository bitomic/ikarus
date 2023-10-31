import { env } from '#lib/environment'
import { ApplyOptions } from '@sapphire/decorators'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../../../drizzle/schema.js'

@ApplyOptions<ListenerOptions>( {
	event: 'ready',
	once: true
} )
export class UserEvent extends Listener {
	public async run(): Promise<void> {
		this.container.logger.info( `Ready! as ${ this.container.client.user?.tag ?? 'unknown user' }` )

		const connection = await mysql.createConnection( env.DATABASE_URL )
		this.container.drizzle = drizzle( connection, {
			mode: 'default',
			schema
		} )
		await this.container.twitch.init()
		await this.container.tasks.create( 'status', null, 0 )
	}
}
