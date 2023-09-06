import { ApplyOptions } from '@sapphire/decorators'
import type { ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { Time } from '@sapphire/duration'
import { TwitchTask } from './_TwitchTask.js'

@ApplyOptions<ScheduledTaskOptions>( {
	enabled: true,
	interval: Time.Minute * 3,
	name: 'new-streams'
} )
export class UserTask extends TwitchTask {
	public override async run(): Promise<void> {
		if ( !this.isReady() ) return

		const twitchFollows = this.container.stores.get( 'models' ).get( 'twitchfollows' )
		const streamers = await twitchFollows.getStreamers()

		const offline = new Set( ( await this.container.redis.keys( 'twitch:active-stream/*' ) )
			.map( i => i.split( /\//g ).at( 1 ) ) )

		this.container.logger.info( 'The following streamings are expected to be still online:', offline )

		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )

			this.container.logger.info( 'The following streamings were fetched in a batch:', streams.map( i => i.user_login ) )

			for ( const stream of streams ) {
				await this.container.tasks.create( 'update-stream', { stream } )
				offline.delete( stream.user_login )
			}
		}

		if ( offline.size === 0 ) return

		this.container.logger.info( 'The following streamings are apparently no longer active:', offline )

		for ( const user of offline ) {
			await this.container.tasks.create( 'remove-stream', { user } )
		}
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		'new-streams': never;
	}
}
