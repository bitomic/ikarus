import type { HalloweenGuild } from '@prisma/client'
import { ApplyOptions } from '@sapphire/decorators'
import { Time } from '@sapphire/duration'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { s } from '@sapphire/shapeshift'
import { ButtonStyle, ChannelType } from 'discord.js'
import random from 'lodash/random.js'
import Rewards from '../data/monsters.json' assert { type: 'json' }
import sample from 'lodash/sample.js'
import { resolveKey } from '@sapphire/plugin-i18next'
import { Colors } from '@bitomic/material-colors'
import { ActionRowBuilder, ButtonBuilder } from '@discordjs/builders'

const Monsters = Object.keys( Rewards ) as Array<keyof typeof Rewards>

@ApplyOptions<ScheduledTaskOptions>( {
	interval: Time.Minute * 5,
	name: 'spawn'
} )
export class UserTask extends ScheduledTask {
	public async run(): Promise<void> {
		const guilds = await this.getGuilds()

		for ( const storedGuild of guilds ) {
			await this.processGuild( storedGuild )
				.catch( () => this.container.logger.error( `There was a problem with the monster spawn task in guild ${ storedGuild.id }.` ) )
		}
	}

	protected getGuilds(): Promise<HalloweenGuild[]> {
		return this.container.prisma.halloweenGuild.findMany( {
			where: {
				enabled: true
			}
		} )
	}

	protected async processGuild( data: HalloweenGuild ): Promise<void> {
		if ( !this.container.client.user?.id ) return

		const guild = await this.container.client.guilds.fetch( data.id )
		const lastSpawn = parseInt( await this.container.redis.get( `halloween:last-spawn/${ guild.id }` ) ?? '', 10 ) || 0
		const canSpawn = lastSpawn + Time.Minute * data.frequency > Date.now()
		if ( !canSpawn ) return

		const chance = data.spawnChance / 100
		const channels = s.string.array.parse( data.channels ).filter( () => random( true ) <= chance )
		if ( channels.length === 0 ) return

		for ( const channelId of channels ) {
			await this.spawnMonster( channelId )
		}
	}

	public async spawnMonster( channelId: string ): Promise<void> {
		const channel = await this.container.client.channels.fetch( channelId )
		if ( channel?.type !== ChannelType.GuildText ) return

		if ( !channel.permissionsFor( this.container.client.user?.id ?? '' )?.has( 'SendMessages' ) ) {
			this.container.logger.warn( `Can't send messages in channel ${ channel.id } for guild ${ channel.guildId }` )
			return
		}

		const monster = sample( Monsters )
		if ( !monster ) return

		const name = await resolveKey( channel, `monsters:${ monster }` )
		const embed = await this.container.utilities.embed.i18n( channel, {
			color: Colors.deepPurple.s800,
			description: 'halloween:spawn.description',
			title: 'halloween:spawn.title'
		}, { monster: name } )

		await channel.send( {
			components: [ new ActionRowBuilder<ButtonBuilder>()
				.addComponents(
					new ButtonBuilder()
						.setCustomId( `trick-${ monster }` )
						.setEmoji( { name: '🎃' } )
						.setLabel( await resolveKey( channel, 'halloween:spawn.trick' ) )
						.setStyle( ButtonStyle.Danger ),
					new ButtonBuilder()
						.setCustomId( `treat-${ monster }` )
						.setEmoji( { name: '🍬' } )
						.setLabel( await resolveKey( channel, 'halloween:spawn.treat' ) )
						.setStyle( ButtonStyle.Success )
				) ],
			embeds: [ embed ]
		} )
	}
}
