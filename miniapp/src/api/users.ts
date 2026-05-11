import { get } from './client'

interface MeResponse {
	id: string
	username: string
	firstName: string
	canScan: boolean
}

export function fetchMe(): Promise<MeResponse> {
	return get<MeResponse>({ action: 'me' })
}
