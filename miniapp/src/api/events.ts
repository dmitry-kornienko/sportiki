import { get } from './client'
import type { Event } from '../types'

export function fetchEvents(): Promise<Event[]> {
	return get<Event[]>({ action: 'events' })
}

export function fetchEvent(id: string): Promise<Event> {
	return get<Event>({ action: 'event', id })
}
