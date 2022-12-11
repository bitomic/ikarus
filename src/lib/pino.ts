import { container, LogLevel } from '@sapphire/framework'
import { magentaBright } from 'colorette'
import Pino from 'pino'
import pretty from 'pino-pretty'

const prettyStream = pretty( {
	colorize: true,
	customPrettifiers: {
		time: ( ts: string | object ) => magentaBright(
			typeof ts === 'string'
				? new Date( ts ).toISOString()
				: new Date().toISOString() )
	},
	ignore: 'pid,hostname',
	mkdir: true
} )

export const pino = Pino(
	{
		timestamp: Pino.stdTimeFunctions.isoTime
	},
	Pino.multistream( [
		{ stream: prettyStream },
		{ stream: Pino.destination( 'pino.log' ) }
	] )
)

const levels = new Set<LogLevel>( [
	LogLevel.Debug, LogLevel.Error, LogLevel.Fatal, LogLevel.Info, LogLevel.None, LogLevel.Trace, LogLevel.Warn
] )

container.logger = {
	debug: ( ...values: readonly unknown[] ) => pino.debug( values[ 0 ] ),
	error: ( ...values: readonly unknown[] ) => pino.error( values[ 0 ] ),
	fatal: ( ...values: readonly unknown[] ) => pino.fatal( values[ 0 ] ),
	has: ( level: LogLevel ) => levels.has( level ),
	info: ( ...values: readonly unknown[] ) => pino.info( values[ 0 ] ),
	trace: ( ...values: readonly unknown[] ) => pino.trace( values[ 0 ] ),
	warn: ( ...values: readonly unknown[] ) => pino.warn( values[ 0 ] ),
	write: ( ...values: readonly unknown[] ) => pino.info( values[ 0 ] )
}
