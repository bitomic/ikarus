import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type APIEmbed, type ApplicationCommandOptionData, ApplicationCommandOptionType, type ChatInputCommandInteraction } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { Colors }  from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'
import { halloweenInventory, halloweenUser } from '#drizzle/schema'
import { and, eq } from 'drizzle-orm'

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'inventory'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: '',
					name: 'member',
					type: ApplicationCommandOptionType.User
				}
			] satisfies ApplicationCommandOptionData[]
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()
		const user = interaction.options.getUser( 'member' ) ?? interaction.user
		const results = await this.container.drizzle.select()
			.from( halloweenUser )
			.leftJoin( halloweenInventory, eq( halloweenInventory.userId, halloweenUser.id ) )
			.where( and(
				eq( halloweenUser.guild, interaction.guildId ),
				eq( halloweenUser.user, user.id )
			) )

		const [ first ] = results

		if ( !first?.HalloweenInventory ) {
			await this.container.utilities.embed.i18n( interaction, {
				author: {
					icon_url: user.avatarURL( { extension: 'png' } ) ?? '',
					name: user.displayName
				},
				color: Colors.deepOrange.s800,
				description: 'halloween:empty-inventory.description',
				title: 'halloween:empty-inventory.title'
			}, null, true )
			return
		}

		const player = {
			...first.HalloweenUser,
			inventory: [] as Array<{
				candyName: string
				count: number
			}>
		}

		for ( const item of results ) {
			if ( !item.HalloweenInventory ) continue
			player.inventory.push( item.HalloweenInventory )
		}

		const embed = await this.container.utilities.embed.i18n( interaction, {
			author: {
				icon_url: user.avatarURL( { extension: 'png' } ) ?? '',
				name: user.displayName
			},
			color: Colors.deepPurple.s800,
			title: 'halloween:inventory.title'
		} )

		const items = await Promise.all( player.inventory.map( async item => {
			const name = await resolveKey( interaction, `monsters:${ item.candyName }` )
			return `${ item.count }× ${ name }`
		} ) )

		this.addFields( embed, await resolveKey( interaction, 'halloween:inventory.candies' ), items )

		await interaction.editReply( {
			embeds: [ embed ]
		} )
	}

	protected addFields( embed: APIEmbed, label: string, values: string[] ): void {
		embed.fields ??= [] // eslint-disable-line @typescript-eslint/no-unnecessary-condition

		if ( values.length < 3 ) {
			embed.fields.push( {
				name: label,
				value: values.join( '\n' )
			} )
		} else {
			embed.fields.push(
				{
					inline: true,
					name: label,
					value: values.slice( 0, Math.floor( values.length / 3 ) ).join( '\n' )
				},
				{
					inline: true,
					name: '\u200b',
					value: values.slice( Math.floor( values.length / 3 ), Math.floor( 2 * values.length / 3 ) ).join( '\n' )
				},
				{
					inline: true,
					name: '\u200b',
					value: values.slice( Math.floor( 2 * values.length / 3 ) ).join( '\n' )
				}
			)
		}
	}
}
