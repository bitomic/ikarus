import { Model } from './Model'
import { Store } from '@sapphire/pieces'

export class ModelStore extends Store<Model> {
	public constructor() {
		super( Model, {
			name: 'models'
		} )
	}

	public override get<K extends keyof ModelRegistryEntries>( key: K ): ModelRegistryEntries[ K ] {
		return super.get( key ) as unknown as ModelRegistryEntries[ K ]
	}
}

declare module '@sapphire/pieces' {
	interface StoreRegistryEntries {
		'models': ModelStore
	}
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ModelRegistryEntries {
    }
}
