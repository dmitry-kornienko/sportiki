import { get, post } from './client'
import type { Event } from '../types'

export interface CreateEventPayload {
	type: string
	title: string
	date: string
	time: string
	maxPeople: number
	reserveLimit: number
	price: number
	paymentInfo: string
	info: string
	location: string
}

export function fetchEvents(): Promise<Event[]> {
	return get<Event[]>({ action: 'events' })
}

export function fetchEvent(id: string): Promise<Event> {
	return get<Event>({ action: 'event', id })
}

export interface UpdateEventPayload extends CreateEventPayload {
	id: string
}

export function createEvent(payload: CreateEventPayload): Promise<{ id: string }> {
	return post<{ id: string }>({ action: 'create_event', ...payload })
}

export function updateEvent(payload: UpdateEventPayload): Promise<{ id: string }> {
	return post<{ id: string }>({ action: 'update_event', ...payload })
}
