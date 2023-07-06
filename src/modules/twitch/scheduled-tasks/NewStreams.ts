import { ApplyOptions } from '@sapphire/decorators'
import type { ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { Time } from '@sapphire/duration'
import { TwitchTask } from './_TwitchTask'

@ApplyOptions<ScheduledTaskOptions>( {
	enabled: true,
	interval: Time.Minute * 1,
	name: 'new-streams'
} )
export class UserTask extends TwitchTask {
	public override async run(): Promise<void> {
		if ( !this.isReady() ) return

		const twitchFollows = this.container.stores.get( 'models' ).get( 'twitchfollows' )
		const streamers = await twitchFollows.getStreamers()

		const offline = new Set( ( await this.container.redis.keys( 'twitch:active-stream/*' ) )
			.map( i => i.split( /\//g ).at( 1 ) ) )

		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )

			for ( const stream of streams ) {
				await this.container.tasks.create( 'update-stream', { stream } )
				offline.delete( stream.user_login )
			}
		}
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
