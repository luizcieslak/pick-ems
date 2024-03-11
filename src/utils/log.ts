const VERBOSE = process.env.VERBOSE === 'true'

export const verboseLog = (message?: any, ...optionalParams: any[]) => {
	if (VERBOSE) console.log(message, ...optionalParams)
}
