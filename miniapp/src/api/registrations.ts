import { get, post } from './client'
import type { Registration, TicketData } from '../types'

export function register(eventId: string): Promise<{ status: string; eventId: string; ticketId: string }> {
	return post({ action: 'register', eventId })
}

export function unregister(eventId: string): Promise<{ unregistered: boolean }> {
	return post({ action: 'unregister', eventId })
}

export function fetchRegistrations(): Promise<Registration[]> {
	return get<Registration[]>({ action: 'registrations' })
}

export function registerGuest(eventId: string, guestName: string): Promise<{ status: string; eventId: string; guestName: string; ticketId: string }> {
	return post({ action: 'register_guest', eventId, guestName })
}

export function unregisterGuest(eventId: string): Promise<{ removed: boolean }> {
	return post({ action: 'unregister_guest', eventId })
}

export function confirmAttendance(eventId: string): Promise<{ confirmed: boolean }> {
	return post({ action: 'confirm_attendance', eventId })
}

export function getTicket(ticketId: string): Promise<TicketData> {
	return get<TicketData>({ action: 'ticket', ticketId })
}

export function checkin(ticketId: string): Promise<{ checkedInAt: string; stats: import('../types').CheckinStats }> {
	return post({ action: 'checkin', ticketId })
}
