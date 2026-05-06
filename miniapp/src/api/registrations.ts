import { get, post } from './client'
import type { Registration } from '../types'

export function register(eventId: string): Promise<{ status: string; eventId: string }> {
	return post({ action: 'register', eventId })
}

export function unregister(eventId: string): Promise<{ unregistered: boolean }> {
	return post({ action: 'unregister', eventId })
}

export function fetchRegistrations(): Promise<Registration[]> {
	return get<Registration[]>({ action: 'registrations' })
}
