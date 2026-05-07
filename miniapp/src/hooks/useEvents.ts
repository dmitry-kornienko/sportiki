import { useState, useEffect } from 'react'
import { fetchEvents } from '../api/events'
import { fetchRegistrations } from '../api/registrations'
import type { Event, Registration } from '../types'

export function useEvents() {
	const [events, setEvents] = useState<Event[]>([])
	const [registrations, setRegistrations] = useState<Registration[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		Promise.all([fetchEvents(), fetchRegistrations()])
			.then(([evs, regs]) => {
				setEvents(evs)
				setRegistrations(regs)
			})
			.catch(e => setError(e.message))
			.finally(() => setLoading(false))
	}, [])

	function isRegistered(eventId: string) {
		return registrations.some(r => r.eventId === eventId)
	}

	function getRegStatus(eventId: string): 'MAIN' | 'RESERVE' | null {
		return registrations.find(r => r.eventId === eventId && !r.isGuest)?.status ?? null
	}

	function getGuestReg(eventId: string): Registration | null {
		return registrations.find(r => r.eventId === eventId && r.isGuest) ?? null
	}

	function updateEvent(updated: Event) {
		setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
	}

	function addRegistration(reg: Registration) {
		setRegistrations(prev => [...prev, reg])
	}

	function removeRegistration(eventId: string) {
		setRegistrations(prev => {
			const idx = prev.findIndex(r => r.eventId === eventId && !r.isGuest)
			if (idx === -1) return prev
			return prev.filter((_, i) => i !== idx)
		})
	}

	function removeGuestRegistration(eventId: string) {
		setRegistrations(prev => {
			const idx = prev.findIndex(r => r.eventId === eventId && r.isGuest)
			if (idx === -1) return prev
			return prev.filter((_, i) => i !== idx)
		})
	}

	return {
		events,
		registrations,
		loading,
		error,
		isRegistered,
		getRegStatus,
		getGuestReg,
		updateEvent,
		addRegistration,
		removeRegistration,
		removeGuestRegistration,
	}
}
