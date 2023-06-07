import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { ApplyOptions } from '@sapphire/decorators'
import { Time } from '@sapphire/duration'

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'new-streams'
} )
export class UserTask extends ScheduledTask {
	public override async run(): Promise<void> {
		if ( !this.container.client.isReady() ) {
			this.container.logger.warn( 'Task[NewStreams]: Client isn\'t ready yet.' )
			return
		}

		const twitchFollows = this.container.stores.get( 'models' ).get( 'twitchfollows' )
		const streamers = await twitchFollows.getStreamers()
		while ( streamers.length ) {
			const chunk = streamers.splice( 0, 100 )
			const streams = await this.container.twitch.getStreams( chunk )

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
