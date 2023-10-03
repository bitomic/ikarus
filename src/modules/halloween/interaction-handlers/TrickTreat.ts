import { ApplyOptions } from '@sapphire/decorators'
import { InteractionHandler, type InteractionHandlerOptions, InteractionHandlerTypes } from '@sapphire/framework'
import { type ButtonInteraction, ComponentType } from 'discord.js'
import Rewards from '../data/monsters.json' assert { type: 'json' }
import { s } from '@sapphire/shapeshift'
import random from 'lodash/random.js'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { resolveKey } from '@sapphire/plugin-i18next'
import type { HalloweenUser, HalloweenUserUpgrade } from '@prisma/client'
import { Colors } from '@bitomic/material-colors'
import sample from 'lodash/sample.js'

const MonsterNames = s.enum( ...Object.keys( Rewards ) as Array<keyof typeof Rewards> )

type HalloweenPlayer = HalloweenUser & {
	HalloweenUpgrades: HalloweenUserUpgrade[]
}

@ApplyOptions<InteractionHandlerOptions>( {
	interactionHandlerType: InteractionHandlerTypes.Button,
	name: 'trick-or-treat'
} )
export class UserHandler extends InteractionHandler {
	public override async parse( interaction: ButtonInteraction ) {
		if ( interaction.customId.startsWith( 'trick-' ) || interaction.customId.startsWith( 'treat-' ) ) {
			await interaction.deferReply( {
				ephemeral: true
			} )

			const buttons = new ActionRowBuilder<ButtonBuilder>()

			for ( const row of interaction.message.components ) {
				for ( const component of row.components ) {
					if ( component.type !== ComponentType.Button ) continue
					const button = new ButtonBuilder( component.data )
					button.setDisabled( true )
					buttons.addComponents( button )
				}
			}

			const embeds: EmbedBuilder[] = []
			for ( const embed of interaction.message.embeds ) {
				const builder = new EmbedBuilder( embed.data )
				builder.setFooter( {
					iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
					text: await resolveKey( interaction, 'halloween:claimed-by', {
						replace: {
							user: interaction.user.displayName
						}
					} )
				} )
				embeds.push( builder )
			}

			await interaction.message.edit( {
				components: [ buttons ],
				embeds
			} )
			return this.some()
		}

		return this.none()
	}

	public override async run( interaction: ButtonInteraction<'cached'> ): Promise<void> {
		const isTreat = interaction.customId.startsWith( 'treat-' )
		const user = await this.getUser( interaction.guildId, interaction.user.id )

		if ( isTreat ) {
			return this.treat( interaction, user )
		}

		const trickSuccess = await this.getTrickSuccess( user )
		if ( trickSuccess ) {
			return this.treat( interaction, user, 2 )
		} else {
			return this.trick( interaction, user )
		}
	}

	protected async getTrickSuccess( user: HalloweenPlayer ): Promise<boolean> {
		const hasCandy = await this.container.prisma.halloweenInventory.count( {
			where: {
				guild: user.guild,
				userId: user.id
			}
		} )
		if ( !hasCandy ) return true

		return random( true ) <= 0.4
	}

	protected async getUser( guildId: string, userId: string ): Promise<HalloweenPlayer> {
		const existing = await this.container.prisma.halloweenUser.findFirst( {
			include: {
				HalloweenUpgrades: true
			},
			where: {
				guild: guildId,
				user: userId
			}
		} )
		if ( existing ) return existing

		return this.container.prisma.halloweenUser.create( {
			data: {
				guild: guildId,
				user: userId
			},
			include: {
				HalloweenCandy: true,
				HalloweenUpgrades: true
			}
		} )
	}

	protected async trick( interaction: ButtonInteraction<'cached'>, user: HalloweenPlayer ): Promise<void> {
		const count = 3 + Math.floor( random( true ) * 3 )
		const inventory = await this.container.prisma.halloweenInventory.findMany( {
			where: {
				count: { gt: 0 },
				guild: interaction.guildId,
				userId: user.id
			}
		} )

		const messageEmbed = interaction.message.embeds.at( 0 )
		if ( !messageEmbed ) return
		const embed = new EmbedBuilder( messageEmbed.data )
		embed.setColor( Colors.deepOrange.s800 )

		if ( !inventory.length ) {
			embed.addFields( {
				name: await resolveKey( interaction, 'halloween:trick.field-name' ),
				value: await resolveKey( interaction, 'halloween:trick.failed-empty' )
			} )
			await interaction.message.edit( { embeds: [ embed ] } )
			await this.container.utilities.embed.i18n( interaction, {
				color: Colors.deepOrange.s800,
				description: 'halloween:trick.failed-notification'
			} )
			return
		}

		const substracts: Record<string, number> = {}
		for ( let i = 0; i < count; i++ ) {
			const slot = sample( inventory )
			if ( !slot ) continue

			substracts[ slot.candyName ] ??= 0 // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			substracts[ slot.candyName ]++
		}

		embed.addFields( {
			name: await resolveKey( interaction, 'halloween:trick.field-name' ),
			value: await resolveKey( interaction, 'halloween:trick.success', {
				replace: {
					list: await this.formatRewardsList( interaction, substracts )
				}
			} )
		} )
		await interaction.message.edit( { embeds: [ embed ] } )
		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepOrange.s800,
			description: 'halloween:trick.success-notification'
		}, null, true )
	}

	protected async treat( interaction: ButtonInteraction<'cached'>, user: HalloweenPlayer, multiplier = 1 ): Promise<void> {
		const monsterValidator = MonsterNames.run( interaction.customId.replace( /(trick|treat)-/, '' ) )
		const monsterName = monsterValidator.isOk() ? monsterValidator.unwrap() : 'alien' as const
		const rewards = this.getRewards( monsterName, multiplier )

		for ( const [ candyName, candyCount ] of Object.entries( rewards ) ) {
			await this.container.prisma.halloweenInventory.upsert( {
				create: {
					candyName,
					count: candyCount,
					guild: interaction.guildId,
					userId: user.id
				},
				update: {
					count: {
						increment: candyCount
					}
				},
				where: {
					candyName_guild_userId: {
						candyName,
						guild: interaction.guildId,
						userId: user.id
					}
				}
			} )
		}

		await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: 'halloween:treat.notification'
		}, null, true )

		const originalEmbed = interaction.message.embeds.at( 0 )
		if ( !originalEmbed ) return

		const key = multiplier === 1 ? 'halloween:treat.field' : 'halloween:treat.field-modified'
		const embed = new EmbedBuilder( originalEmbed.data )
		embed.addFields( {
			name: await resolveKey( interaction, key ),
			value: await this.formatRewardsList( interaction, rewards )
		} )

		await interaction.message.edit( { embeds: [ embed ] } )
	}

	protected async formatRewardsList( interaction: ButtonInteraction<'cached'>, rewards: Record<string, number> ): Promise<string> {
		const promises = Object.entries( rewards ).map( async ( [ name, count ] ) => {
			const item = await resolveKey( interaction, `monsters:${ name }` )
			return `${ count }× ${ item }`
		} )
		const list = await Promise.all( promises )
		return list.join( '\n' )
	}

	protected getRewards( monsterName: keyof typeof Rewards, multiplier: number ): Record<string, number> {
		const rewards: Record<string, number> = {}
		const monsterDrops = Rewards[ monsterName ] as [ string, string, string ]

		const rewardCount = 3 + Math.floor( random( true ) * 5 * multiplier )
		for ( let i = 0; i < rewardCount; i++ ) {
			const rewardChance = random( true )

			let drop: string
			if ( rewardChance <= 0.5 ) {
				drop = monsterDrops[ 0 ] // eslint-disable-line prefer-destructuring
			} else if ( rewardChance <= 0.85 ) {
				drop = monsterDrops[ 1 ] // eslint-disable-line prefer-destructuring
			} else {
				drop = monsterDrops[ 2 ] // eslint-disable-line prefer-destructuring
			}

			rewards[ drop ] ??= 0 // eslint-disable-line @typescript-eslint/no-unnecessary-condition
			rewards[ drop ]++
		}

		return rewards
	}
}
