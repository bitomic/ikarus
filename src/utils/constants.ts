import { s } from '@sapphire/shapeshift'

const GuildSettingsKeys = [
	'starboard-channel',
	'starboard-count'
] as const

export const GuildSettings = s.enum(
	...GuildSettingsKeys
)

export type GuildSettingKey = typeof GuildSettingsKeys[ number ]
