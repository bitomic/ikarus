import { type ApplicationCommandOptionData, ApplicationCommandOptionType, type AutocompleteInteraction, type ChatInputCommandInteraction } from 'discord.js'
import { type ApplicationCommandRegistry, Command, type CommandOptions } from '@sapphire/framework'
import { ApplyOptions } from '@sapphire/decorators'
import { Wiki } from '@quority/fandom'
import { env } from '#lib/environment'
import { EmbedBuilder, hyperlink } from '@discordjs/builders'
import { Colors } from '@bitomic/material-colors'
import { request } from 'undici'
import { s } from '@sapphire/shapeshift'

interface UniteProfileCreateInput {
    code?: string
    favoritePokemon?: string
    name: string
	user: string
}

interface UniteProfileUpdateInput {
    code?: string
    favoritePokemon?: string
    name?: string
}

@ApplyOptions<CommandOptions>( {
	enabled: true,
	name: 'perfil-unite'
} )
export class UserCommand extends Command {
	public override registerApplicationCommands( registry: ApplicationCommandRegistry ): void {
		registry.registerChatInputCommand( {
			description: 'Configura o consulta el perfil de un jugador de Pokémon UNITE',
			dmPermission: false,
			name: this.name,
			options: [
				{
					description: 'Registra o actualiza tu información.',
					name: 'registrar',
					options: [
						{
							description: 'Tu nombre dentro del juego.',
							maxLength: 20,
							minLength: 1,
							name: 'name',
							nameLocalizations: {
								'es-ES': 'nombre'
							},
							required: false,
							type: ApplicationCommandOptionType.String
						},
						{
							description: 'Tu código de amigo.',
							maxLength: 10,
							minLength: 1,
							name: 'code',
							nameLocalizations: {
								'es-ES': 'código'
							},
							required: false,
							type: ApplicationCommandOptionType.String
						},
						{
							autocomplete: true,
							description: 'Tu Pokémon favorito o el que más usas.',
							maxLength: 20,
							minLength: 1,
							name: 'pokemon',
							nameLocalizations: {
								'es-ES': 'pokémon'
							},
							required: false,
							type: ApplicationCommandOptionType.String
						}
					],
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: 'Elimina tu información para que no pueda ser consultada por otros.',
					name: 'borrar',
					type: ApplicationCommandOptionType.Subcommand
				},
				{
					description: 'Muestra tu información de entrenador o la de otro usuario.',
					name: 'consultar',
					options: [ {
						description: 'Consulta la información de alguien más.',
						name: 'user',
						nameLocalizations: {
							'es-ES': 'usuario'
						},
						required: false,
						type: ApplicationCommandOptionType.User
					} ],
					type: ApplicationCommandOptionType.Subcommand
				}
			] satisfies ApplicationCommandOptionData[]
		}, { guildIds: [ env.NODE_ENV === 'development' ? env.DISCORD_DEVELOPMENT_SERVER : '1091101890084884630' ] } )
	}

	public override async autocompleteRun( interaction: AutocompleteInteraction<'cached'> ) {
		const focused = interaction.options.getFocused().toLowerCase()

		const options = await this.getPokemonOptions()
		const filtered = options.filter( option => option.toLowerCase().includes( focused ) ).slice( 0, 10 )
		await interaction.respond( filtered.map( option => ( {
			name: option,
			value: option
		} ) ) )
	}

	protected async getPokemonOptions(): Promise<string[]> {
		const key = 'unite:available-pokemon'
		const { redis } = this.container
		const cached = await redis.smembers( key )

		if ( cached.length ) return cached

		const wiki = new Wiki( {
			api: 'es.pokemon-unite'
		} )
		const titles = ( await wiki.queryList( {
			cmlimit: 'max',
			cmnamespace: 0,
			cmtitle: 'Categoría:Licencias Unite',
			list: 'categorymembers'
		} ) ).map( i => i.title )
		await redis.sadd( key, ...titles )
		await redis.expire( key, 60 * 60 * 24 )

		return titles
	}

	public override async chatInputRun( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await interaction.deferReply()
		const subcommand = interaction.options.getSubcommand()

		if ( subcommand === 'registrar' ) {
			await this.add( interaction )
		} else if ( subcommand === 'borrar' ) {
			await this.remove( interaction )
		} else if ( subcommand === 'consultar' ) {
			await this.show( interaction )
		}
	}

	protected async add( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const name = interaction.options.getString( 'name' ) ?? interaction.user.username
		const code = interaction.options.getString( 'code' )?.replace( '#', '' )
		const pkmn = interaction.options.getString( 'pokemon' )?.toLowerCase()

		const options = await this.getPokemonOptions()
		const pokemon = pkmn ? options.find( i => i.toLowerCase().startsWith( pkmn ) ) : undefined

		const create: UniteProfileCreateInput = {
			name,
			user: interaction.user.id
		}
		const update: UniteProfileUpdateInput = { name }

		if ( code ) {
			create.code = code
			update.code = code
		}
		if ( pokemon ) {
			create.favoritePokemon = pokemon
			update.favoritePokemon = pokemon
		}

		await this.container.prisma.uniteProfile.upsert( {
			create,
			update,
			where: {
				user: interaction.user.id
			}
		} )

		await this.show( interaction )
	}

	protected async remove( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		await this.container.prisma.uniteProfile.delete( {
			where: {
				user: interaction.user.id
			}
		} )

		const embed = new EmbedBuilder()
			.setColor( Colors.amber.s800 )
			.setDescription( 'Se ha eliminado tu información de entrenador.' )

		await interaction.editReply( {
			embeds: [ embed ]
		} )
	}

	protected async show( interaction: ChatInputCommandInteraction<'cached'> ): Promise<void> {
		const user = interaction.options.getUser( 'user' ) ?? interaction.user

		const item = await this.container.prisma.uniteProfile.findFirst( {
			where: {
				user: user.id
			}
		} )

		if ( !item ) {
			const commandId = [ ...this.applicationCommandRegistry.chatInputCommands.values() ].pop() ?? '0'
			await interaction.editReply( {
				embeds: [ {
					color: Colors.amber.s800,
					description: `Tu información de entrenador no está registrada. Puedes hacerlo ahora mismo usando </perfil-unite registrar:${ commandId }>.`
				} ]
			} )
			return
		}

		const embed = new EmbedBuilder()
			.setColor( Colors.deepOrange.s800 )
			.setTitle( 'Ficha de entrenador' )
			.setAuthor( {
				iconURL: interaction.user.avatarURL( { extension: 'png' } ) ?? '',
				name: interaction.user.username
			} )
			.addFields( {
				inline: true,
				name: 'Jugador',
				value: hyperlink( item.name, `https://uniteapi.dev/p/${ item.name }` )
			} )

		const pokemonIcon = item.favoritePokemon ? await this.getPokemonImage( item.favoritePokemon ) : null
		if ( pokemonIcon ) {
			embed.setThumbnail( pokemonIcon )
		}

		if ( item.code ) {
			embed.addFields( {
				inline: true,
				name: 'Código',
				value: item.code
			} )
		}

		await interaction.editReply( {
			embeds: [ embed ]
		} )
	}

	protected async getPokemonImage( name: string ): Promise<string | null> {
		const req = await request( `https://pokemon-unite.fandom.com/es/wiki/Special:Filepath/Pokémon_${ name }.png`, { maxRedirections: 5, method: 'HEAD' } )

		const history = s.object( {
			history: s.string.url().array
		} ).run( JSON.parse( JSON.stringify( req.context ) ) )

		if ( history.isErr() ) return null

		const lastItem = history.unwrap().history.at( -1 )
		return lastItem ?? null
	}
}
