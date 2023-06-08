import { ApplyOptions } from '@sapphire/decorators'
import type { ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { Time } from '@sapphire/duration'
import { TwitchTask } from './_TwitchTask'

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'new-streams'
} )
export class UserTask extends TwitchTask {
	public override async run(): Promise<void> {
		if ( !this.isReady() ) return
		this.container.logger.info( `Running ${ this.name } task.` )

		const twitchFollows = this.container.stores.get( 'models' ).get( 'twitchfollows' )
		const streamers = await twitchFollows.getStreamers()
		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )
			this.container.logger.info( `Found ${ streams.length } active streams.`, streams )

			for ( const stream of streams ) {
				await this.container.tasks.create( 'update-stream', { stream } )
			}

			const offline = chunk.reduce( ( list, name ) => {
				const isOnline = streams.find( s => s.user_login === name )
				if ( !isOnline ) {
					list.push( name )
				}
				return list
			}, [] as string[] )

			for ( const user of offline ) {
				await this.container.tasks.create( 'remove-stream', { user } )
			}
		}
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'new-streams': never;
	}
}
