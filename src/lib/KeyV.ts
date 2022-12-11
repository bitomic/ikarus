import { container } from '@sapphire/framework'

export class KeyV {
	public readonly guild: string
	protected readonly keyv = container.stores.get( 'models' ).get( 'keyv' )

	public constructor( guild: string ) {
		this.guild = guild
	}

	public get( key: string ): Promise<string | null> {
		return this.keyv.get( this.guild, key )
	}

	public async set( key: string, value: string ): Promise<void> {
		await this.keyv.set( this.guild, key, value )
	}

	public async delete( key: string ): Promise<void> {
		await this.keyv.delete( this.guild, key )
	}
}
