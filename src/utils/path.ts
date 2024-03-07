import * as fs from 'fs/promises'

export const fileExists = (path: string) =>
	fs.stat(path).then(
		() => true,
		() => false
	)
