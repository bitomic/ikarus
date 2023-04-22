import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from '@discordjs/builders'
import { type APIEmbedAuthor, ButtonStyle, ChannelType, type Message, type MessageCreateOptions, type TextChannel } from 'discord.js'
import { ScheduledTask, type ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks'
import { ApplyOptions } from '@sapphire/decorators'
import Colors from '@bitomic/material-colors'
import { ConfigurationKey } from '@prisma/client'
import { resolveKey } from '@sapphire/plugin-i18next'
import { UserError } from '@sapphire/framework'

export interface StarboardPayload {
	messageId: string
}

@ApplyOptions<ScheduledTaskOptions>( {
	name: 'starboard'
} )
export class UserTask extends ScheduledTask {
	public override async run( { messageId }: StarboardPayload ): Promise<void> {
		if ( !this.container.client.isReady() ) {
			this.container.logger.warn( 'Task[Count]: Client isn\'t ready yet.' )
			return
		}

		const { prisma, redis } = this.container

		try {
			const message = await this.fetchMessage( messageId )
			const users = await message.reactions.resolve( '⭐' )?.users.fetch()

			if ( !users ) {
				throw new UserError( {
					context: { message },
					identifier: 'ReactionNoUsers',
					message: 'Couldn\'t get users from reaction.'
				} )
			}
			const snowflakes = users.map( i => i.id )
			await redis.sadd( `starboard:${ message.id }`, ...snowflakes )

			const stored = await prisma.starboard.findUnique( {
				where: {
					originalId: messageId
				}
			} )

			if ( stored ) {
				await this.updatePin( message )
			} else {
				await this.createPin( message )
			}
		} catch ( e ) {
			this.container.logger.error( 'Error thrown on Starboard task.', e )
		}
	}

	protected async fetchMessage( messageId: string ): Promise<Message<true>> {
		const { message } = this.container.prisma
		const item = await message.findUniqueOrThrow( {
			where: {
				message: messageId
			}
		} )

		const channel = await this.container.client.channels.fetch( item.thread ?? item.channel )
		if ( !channel?.isTextBased() ) {
			throw new UserError( {
				context: { channel },
				identifier: 'ChannelNotFound',
				message: `Couldn't find channel ${ item.channel } (thread: ${ item.thread ?? 'null' }) in guild ${ item.guild }.`
			} )
		}

		return channel.messages.fetch( item.message ) as Promise<Message<true>>
	}

	protected async getStarboardChannel( guildId: string ): Promise<TextChannel> {
		const models = this.container.stores.get( 'models' )

		const { snowflake } = this.container.utilities.validation
		const configuration = models.get( 'configuration' )
		const starboardChannel = await configuration.get( guildId, ConfigurationKey.StarboardChannel, snowflake )
		if ( !starboardChannel ) {
			throw new UserError( {
				context: { guildId },
				identifier: 'NoStarboardChannel',
				message: `Couldn't find a stored channel for the starboard in guild ${ guildId }.`
			} )
		}

		const channel = await this.container.client.channels.fetch( starboardChannel )
		if ( channel?.type !== ChannelType.GuildText ) {
			throw new UserError( {
				context: { channel, guildId },
				identifier: 'InvalidStarboardChannel',
				message: 'Channel set for starboard isn\'t valid.'
			} )
		}

		return channel
	}

	protected async createPin( message: Message<true> ): Promise<void> {
		const buttonLabel = await resolveKey( message, 'starboard:go-to-message' )
		const options: MessageCreateOptions = {
			components: [ new ActionRowBuilder<ButtonBuilder>( {
				components: [ new ButtonBuilder( {
					label: buttonLabel,
					style: ButtonStyle.Link,
					url: message.url
				} ).toJSON() ]
			} ) ],
			embeds: message.embeds.slice( 0, 1 )
		}

		if ( message.content.length > 0 || message.attachments.at( 0 ) ) {
			const embed = new EmbedBuilder( {
				author: await this.getAuthorData( message ),
				color: Colors.amber.s800,
				footer: {
					text: `${ message.id } • #${ message.channel.name }`
				},
				timestamp: message.createdAt.toString()
			} )
			embed.setImage( message.attachments.at( 0 )?.url ?? null )
			embed.setDescription( message.content || null )
			options.embeds?.unshift( embed )
		} else {
			options.embeds?.push( new EmbedBuilder( {
				color: Colors.amber.s800,
				footer: {
					text: `${ message.id } • #${ message.channel.name }`
				},
				timestamp: message.createdAt.toString()
			} ) )

			options.embeds?.unshift( new EmbedBuilder( {
				author: await this.getAuthorData( message ),
				color: Colors.amber.s800
			} ) )
		}

		if ( message.reference ) {
			const reference = await message.fetchReference()

			const firstEmbed = reference.embeds.at( 0 )
			if ( firstEmbed ) {
				const embed = new EmbedBuilder( firstEmbed.toJSON() )
				embed.setColor( 0x2b2d31 )

				options.embeds?.unshift( embed )
			}

			const label = await resolveKey( message, 'general:reply-to', {
				replace: {
					user: this.getAuthorName( reference )
				}
			} )
			const replying = new EmbedBuilder( {
				author: {
					icon_url: await this.container.images.getUserAvatar( reference.member ),
					name: label
				},
				color: 0x2b2d31
			} )
			if ( reference.content.length > 0 ) {
				replying.setDescription( reference.content )
			}
			replying.setImage( reference.attachments.at( 0 )?.url ?? null )

			options.embeds?.unshift( replying )
		}

		const starboard = await this.getStarboardChannel( message.guildId )
		const count = await this.container.redis.scard( `starboard:${ message.id }` )
		const pin = await starboard.send( {
			...options,
			content: `⭐ ${ count }`
		} )
		const messages = this.container.stores.get( 'models' ).get( 'messages' )
		await messages.assert( pin )
		await this.container.prisma.starboard.create( {
			data: {
				originalId: message.id,
				pinnedId: pin.id
			}
		} )
	}

	protected async updatePin( message: Message<true> ): Promise<void> {
		const item = await this.container.prisma.starboard.findUniqueOrThrow( {
			include: { pinned: true },
			where: {
				originalId: message.id
			}
		} )
		const channel = await this.container.client.channels.fetch( item.pinned.channel )
		if ( channel?.type !== ChannelType.GuildText ) {
			throw new UserError( {
				context: item,
				identifier: 'ChannelNotFound'
			} )
		}
		const pin = await channel.messages.fetch( item.pinnedId )
		const count = await this.container.redis.scard( `starboard:${ message.id }` )
		await pin.edit( {
			content: `⭐ ${ count }`
		} )
	}

	protected async getAuthorData( message: Message<true> ): Promise<APIEmbedAuthor> {
		return {
			icon_url: await this.container.images.getUserAvatar( message.member ?? message.author ),
			name: this.getAuthorName( message )
		}
	}

	protected getAuthorName( message: Message<true> ): string {
		return !message.member?.nickname || message.member.nickname === message.author.username
			? message.author.tag
			: `${ message.member.nickname } (${ message.author.tag })`
	}
}

declare module '@sapphire/plugin-scheduled-tasks' {
	interface ScheduledTasks {
		starboard: never;
	}
}
