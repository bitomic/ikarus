import { ApplyOptions } from '@sapphire/decorators'
import { Listener, type ListenerOptions } from '@sapphire/framework'
import { ScheduledTaskEvents } from '@sapphire/plugin-scheduled-tasks'

@ApplyOptions<ListenerOptions>( {
	event: ScheduledTaskEvents.ScheduledTaskStrategyConnectError
} )
export class UserEvent extends Listener {
	public run( ...args: unknown[] ) {
		this.container.logger.info( 'connection error', args )
	}
}
