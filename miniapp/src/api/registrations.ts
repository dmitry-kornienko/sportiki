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

export function registerGuest(eventId: string, guestName: string): Promise<{ status: string; eventId: string; guestName: string }> {
	return post({ action: 'register_guest', eventId, guestName })
}

export function unregisterGuest(eventId: string): Promise<{ removed: boolean }> {
	return post({ action: 'unregister_guest', eventId })
}
