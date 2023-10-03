import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { type ChatInputCommandInteraction } from 'discord.js'
import { i18n } from '#decorators/i18n'
import { Colors }  from '@bitomic/material-colors'
import { resolveKey } from '@sapphire/plugin-i18next'
import Recipes from '../data/recipes.json' assert { type: 'json' }

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'recipes'
} )
export class UserCommand extends Command {
	@i18n
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: this.description,
			dmPermission: false,
			name: this.name
		} )
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()

		const embed = await this.container.utilities.embed.i18n( interaction, {
			color: Colors.deepPurple.s800,
			description: 'halloween:recipes.description',
			fields: [],
			title: 'halloween:recipes.title'
		} )

		for ( const [ name, data ] of Object.entries( Recipes ) ) {
			const item = await resolveKey( interaction, `recipes:${ name }` )
			const materials = Object.entries( data.materials ).map( async ( [ name, amount ] ) => {
				const translated = await resolveKey( interaction, `monsters:${ name }` )
				return `${ amount }× ${ translated }`
			} )
			const translated = await Promise.all( materials )
			embed.fields?.push( {
				inline: true,
				name: item,
				value: translated.join( '\n' )
			} )
		}

		await interaction.editReply( { embeds: [ embed ] } )
	}
}
