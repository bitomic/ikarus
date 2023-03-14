import { ApplicationCommandOptionType, type ChatInputApplicationCommandData, Locale } from 'discord.js'
import { type ApplicationCommandRegistry, container } from '@sapphire/framework'
import { env } from '../lib'
import { s } from '@sapphire/shapeshift'
import type { TFunction } from 'i18next'

interface Localizable {
	descriptionLocalizations?: Partial<Record<Locale, string | null>>
	nameLocalizations?: Partial<Record<Locale, string | null>>
}

const tHelper = ( locale: Locale, t: ( value: string ) => string, target: Localizable, prefix?: string ) => {
	prefix = prefix ? `${ prefix }.` : ''
	target.descriptionLocalizations ??= {}
	target.descriptionLocalizations[ locale ] = t( `${ prefix }description` )
	target.nameLocalizations ??= {}
	target.nameLocalizations[ locale ] = t( `${ prefix }name` )
}

export const i18n = ( _target: unknown, methodName: string, descriptor: PropertyDescriptor ) => {
	if ( methodName !== 'registerApplicationCommands' ) {
		throw new Error( 'i18n decorator must only be used in the registerApplicationCommands method.' )
	}

	let command: Parameters<ApplicationCommandRegistry[ 'registerChatInputCommand' ]>[ 0 ] | undefined
	let options: ApplicationCommandRegistry.RegisterOptions | undefined
	const registryMock = {
		registerChatInputCommand: ( ...args: Parameters<ApplicationCommandRegistry[ 'registerChatInputCommand' ]> ) => {
			[ command, options ] = args
		}
	}

	const original = descriptor.value as ( registry: typeof registryMock ) => void
	descriptor.value = function( registry: ApplicationCommandRegistry ) {
		original.call( this, registryMock )

		if ( !command ) return

		const en = container.i18n.getT( 'en-US' )
		const tBase = ( i18n: TFunction, command: string, value: string ) => i18n( `commands:${ command }.${ value }` )
		const t = tBase.bind( undefined, en, command.name )

		const updatedCommand: ChatInputApplicationCommandData = {
			description: t( 'description' ),
			name: t( 'name' )
		}

		const { languages } = container.i18n
		const validateLocale = s.nativeEnum( Locale )

		const translateCommand = ( command: ChatInputApplicationCommandData, locale: Locale, t: ( value: string ) => string ) => {
			const localize = tHelper.bind( undefined, locale, t )

			localize( command )
			if ( !command.options ) return

			for ( const option of command.options ) {
				localize( option, `options.${ option.name }` )

				if ( option.type === ApplicationCommandOptionType.SubcommandGroup && option.options ) {
					for ( const subcommand of option.options ) {
						localize( subcommand, `options.${ option.name }.subcommands.${ subcommand.name }` )

						for ( const subcommandOption of subcommand.options ?? [] ) {
							localize( subcommandOption, `options.${ option.name }.subcommands.${ subcommand.name }.options.${ subcommandOption.name }` )
						}
					}
				} else if ( option.type === ApplicationCommandOptionType.Subcommand && option.options ) {
					for ( const subcommandOption of option.options ) {
						localize( subcommandOption, `options.${ option.name }.options.${ subcommandOption.name }` )
					}
				}
			}
		}

		for ( const [ _lang, translate ] of languages ) {
			const lang = validateLocale.parse( _lang )
			if ( lang === Locale.EnglishUS ) continue
			const t = tBase.bind( undefined, translate, command.name )
			translateCommand( updatedCommand, lang, t )
		}

		options ??= {}
		if ( env.NODE_ENV === 'development' ) {
			options.guildIds = [ env.DISCORD_DEVELOPMENT_SERVER ]
		}
		registry.registerChatInputCommand( Object.assign( command, updatedCommand ), options )
	}
}
