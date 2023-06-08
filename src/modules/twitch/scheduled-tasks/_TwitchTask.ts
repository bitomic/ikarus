import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import type { PieceContext } from '@sapphire/pieces'
import { s } from '@sapphire/shapeshift'
import { SnowflakeRegex } from '@sapphire/discord-utilities'

export interface ActiveStream {
	channel: string
	message: string
	streamer: string
	vod: string
}

export abstract class TwitchTask extends ScheduledTask {
	public readonly activeStreamValidator = s.object( {
		channel: s.string.regex( SnowflakeRegex ),
		message: s.string.regex( SnowflakeRegex ),
		streamer: s.string,
		vod: s.string
	} ).ignore

	public constructor( context: PieceContext, options: ScheduledTaskOptions ) {
		super( context, {
			name: '',
			...options
		} )
	}

	protected isReady(): boolean {
		if ( !this.container.client.isReady() ) {
			this.container.logger.warn( `Task[${ this.name }]: Client isn't ready yet.` )
			return false
		}

		return true
	}

	protected activeStreamKey( channel: string, streamer: string ): string {
		return `twitch:active-stream/${ streamer }/${ channel }`
	}
}
