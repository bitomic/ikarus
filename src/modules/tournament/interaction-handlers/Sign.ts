import { message as Messages, tournamentGame, tournamentTeam } from '#drizzle/schema'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, type ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { type ButtonInteraction, ChannelType, type ThreadChannel } from 'discord.js'
import { and, eq, sql } from 'drizzle-orm'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button,
	name: 'tournament-buttons'
} )
export class UserHandler extends InteractionHandler {
	public override parse( interaction: ButtonInteraction ) {
		const { customId } = interaction

		if ( customId.startsWith( 'tournament-' ) ) {
			return this.some()
		}

		return this.none()
	}

	public override async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		await interaction.deferUpdate()

		try {
			const game = await this.findGameById( interaction )
			await this.disableButton( interaction )

			if ( interaction.customId.startsWith( 'tournament-join' ) ) {
				await this.join( interaction, game )
			} else if ( interaction.customId.startsWith( 'tournament-leave' ) ) {
				await this.leave( interaction, game )
			} else {
				await this.list( interaction, game )
			}
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( {
				content: 'Hubo un problema al intentar procesar la acción. Por favor inténtalo de nuevo, y si el problema persiste, contacta con un administrador.'
			} )
		}
	}

	protected async disableButton( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		const { customId } = interaction

		const position = customId.startsWith( 'tournament-list' ) ? 1 : 0

		const rawRow = interaction.message.components.at( 0 )
		if ( !rawRow ) return

		const row = new ActionRowBuilder<ButtonBuilder>( rawRow.toJSON() )
		row.components.at( position )?.setDisabled( true )

		await interaction.editReply( {
			components: [ row ]
		} )
	}

	protected async join( interaction: ButtonInteraction<'cached'>, game: typeof tournamentGame.$inferSelect ): Promise<void> {
		const alreadyRegistered = await this.findSingleplayer( game.id, interaction.user.id )

		if ( alreadyRegistered ) {
			await interaction.editReply( {
				content: 'Ya te encontrabas registrado para este torneo.'
			} )
			return
		}

		const thread = await this.getLoggingThread( interaction )
		const [ count ] = await this.container.drizzle
			.select( {
				count: sql<number>`COUNT(*)`
			} )
			.from( tournamentTeam )
			.where( eq( tournamentTeam.tournament, game.id ) )
		const total = count?.count ?? 0

		const embed = new EmbedBuilder()
			.setColor( Colors.green.s800 )
			.setTitle( game.game )
			.setDescription( `Se ha añadido un registro para el torneo.\n¡Eres el participante número ${ total + 1 }!` )
			.setAuthor( {
				iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
				name: interaction.user.username
			} )

		const message = await thread.send( {
			content: `<@!${ interaction.user.id }>`,
			embeds: [ embed ]
		} )
		await this.signUser( interaction, game, thread.id, message.id )
		await interaction.editReply( {
			content: 'Se ha guardado tu registro exitosamente.'
		} )
	}

	protected async leave( interaction: ButtonInteraction<'cached'>, game: typeof tournamentGame.$inferSelect ): Promise<void> {
		const isRegistered = await this.findSingleplayer( game.id, interaction.user.id )
		if ( !isRegistered ) {
			await interaction.editReply( {
				content: 'No te encuentras registrado en este torneo.'
			} )
			return
		}

		const thread = await this.getLoggingThread( interaction )
		const embed = new EmbedBuilder()
			.setColor( Colors.red.s800 )
			.setTitle( game.game )
			.setDescription( 'Se ha anulado un registro.' )
			.setAuthor( {
				iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
				name: interaction.user.username
			} )

		await thread.send( {
			content: `<@!${ interaction.user.id }>`,
			embeds: [ embed ]
		} )
		await this.dropUser( interaction.user.id, game.id )
		await interaction.editReply( {
			content: 'Se ha cancelado tu registro exitosamente.'
		} )
	}

	protected async list( interaction: ButtonInteraction<'cached'>, game: typeof tournamentGame.$inferSelect ): Promise<void> {
		const teams = await this.container.drizzle
			.select( {
				user: tournamentTeam.name
			} )
			.from( tournamentTeam )
			.where( eq( tournamentTeam.tournament, game.id ) )

		const embed = new EmbedBuilder()
			.setColor( Colors.lightBlue.s800 )
			.setTitle( `Registro para ${ game.game }` )

		if ( !teams.length ) {
			embed.setDescription( 'Parece ser que no hay jugadores registrados todavía.' )
		} else {
			const users = await interaction.guild.members.fetch( {
				user: teams.map( i => i.user )
			} )
			const list = users.map( member => `<@!${ member.user.id }> (${ member.user.username })` ).join( '\n' )
			embed.setDescription( `Hay ${ teams.length } jugadores registrados para este torneo:\n\n${ list }` )
		}

		await interaction.editReply( {
			embeds: [ embed ]
		} )
	}

	protected async findGameById( interaction: ButtonInteraction<'cached'> ): Promise<typeof tournamentGame.$inferSelect> {
		const gameId = parseInt( s.string.parse( interaction.customId.match( /\d+/ )?.[ 0 ] ), 10 )
		const [ game ] = await this.container.drizzle.select()
			.from( tournamentGame )
			.where( eq( tournamentGame.id, gameId ) )
			.limit( 1 )

		if ( !game ) {
			await interaction.editReply( {
				content: 'Hubo un problema al intentar encontrar el juego seleccionado. Si el problema persiste, contacta con un administrador.'
			} )
			throw new Error()
		}

		return game
	}

	protected async findSingleplayer( tournament: number, user: string ): Promise<typeof tournamentTeam.$inferSelect | null> {
		const [ result ] = await this.container.drizzle.select()
			.from( tournamentTeam )
			.where( and(
				eq( tournamentTeam.tournament, tournament ),
				eq( tournamentTeam.name, user )
			) )
			.limit( 1 )

		return result ?? null
	}

	protected async getLoggingThread( interaction: ButtonInteraction ): Promise<ThreadChannel> {
		const channel = await this.container.utilities.channel.getChannel( interaction.channelId, ChannelType.GuildText )
		const thread = await this.container.utilities.channel.findThreadByName( channel, 'Registros', ChannelType.PublicThread )
		return thread
	}

	protected async signUser( interaction: ButtonInteraction<'cached'>, game: typeof tournamentGame.$inferSelect, thread: string, message: string ): Promise<void> {
		const { drizzle } = this.container

		await drizzle.insert( Messages )
			.values( {
				author: interaction.user.id,
				channel: interaction.channelId,
				guild: interaction.guildId,
				message,
				thread: thread
			} )
		await drizzle.insert( tournamentTeam )
			.values( {
				message,
				name: interaction.user.id,
				players: [ interaction.user.id ],
				tournament: game.id
			} )
	}

	protected async dropUser( user: string, tournament: number ): Promise<void> {
		const { drizzle } = this.container

		await drizzle.delete( tournamentTeam )
			.where( and(
				eq( tournamentTeam.tournament, tournament ),
				eq( tournamentTeam.name, user )
			) )
	}
}
