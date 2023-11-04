import { tournamentGame, tournamentTeam } from '#drizzle/schema'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { ApplyOptions } from '@sapphire/decorators'
import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { s } from '@sapphire/shapeshift'
import { ButtonStyle, type StringSelectMenuInteraction } from 'discord.js'
import { eq } from 'drizzle-orm'

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.SelectMenu,
	name: 'select-game'
} )
export class UserHandler extends InteractionHandler {
	public override parse( interaction: StringSelectMenuInteraction ) {
		if ( interaction.customId === 'tournament-game' ) {
			return this.some()
		}

		return this.none()
	}

	public override async run( interaction: StringSelectMenuInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply( { ephemeral: true } )

		try {
			const game = await this.findGameById( interaction )
			await this.handle( interaction, game )
		} catch ( e ) {
			this.container.logger.error( e )
			await interaction.editReply( {
				content: 'Hubo un problema al intentar procesar la acción. Por favor inténtalo de nuevo, y si el problema persiste, contacta con un administrador.'
			} )
		}
	}

	protected async handle( interaction: StringSelectMenuInteraction<'cached'>, game: typeof tournamentGame.$inferSelect ): Promise<void> {
		if ( game.maxPlayers === 1 ) {
			await this.handleSingleplayer( interaction, game )
		} else {
			await interaction.editReply( {
				content: 'Lo siento, por el momento no es posible inscribir equipos.'
			} )
		}
	}

	protected async handleSingleplayer( interaction: StringSelectMenuInteraction<'cached'>, game: typeof tournamentGame.$inferSelect ): Promise<void> {
		const [ isRegistered ] = await this.container.drizzle.select()
			.from( tournamentTeam )
			.where( eq( tournamentTeam.tournament, game.id ) )
			.limit( 1 )

		const listButton = new ButtonBuilder()
			.setCustomId( `tournament-list-${ game.id }` )
			.setLabel( 'Lista de jugadores' )
			.setStyle( ButtonStyle.Secondary )

		if ( isRegistered ) {
			const embed = new EmbedBuilder()
				.setColor( Colors.lightBlue.s800 )
				.setTitle( `Ya estás registrado para ${ game.game }` )
				.setDescription( '¿Deseas modificar tu registro?' )
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId( `tournament-leave-${ game.id }` )
						.setLabel( 'Abandonar' )
						.setStyle( ButtonStyle.Danger ),
					listButton
				)
			await interaction.editReply( {
				components: [ row ],
				embeds: [ embed ]
			} )
		} else {
			const embed = new EmbedBuilder()
				.setColor( Colors.lightBlue.s800 )
				.setTitle( `Participa para ${ game.game }` )
				.setDescription( '¿Deseas registrarte?' )
			const row = new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId( `tournament-join-${ game.id }` )
						.setLabel( 'Inscribirme' )
						.setStyle( ButtonStyle.Success ),
					listButton
				)
			await interaction.editReply( {
				components: [ row ],
				embeds: [ embed ]
			} )
		}
	}

	protected async findGameById( interaction: StringSelectMenuInteraction<'cached'> ): Promise<typeof tournamentGame.$inferSelect> {
		const gameId = parseInt( s.string.parse( interaction.values.at( 0 ) ), 10 )
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
}
