import { useState } from 'react'
import { fetchEvent } from '../api/events'
import { register, unregister, registerGuest, unregisterGuest } from '../api/registrations'
import type { Event, Registration } from '../types'
import { useToastAction } from '../context/ToastContext'

interface Props {
	event: Event
	guestReg: Registration | null
	setEvent: (e: Event) => void
	onRegister: (eventId: string, status: 'MAIN' | 'RESERVE', ticketId: string) => void
	onUnregister: (eventId: string) => void
	onGuestRegister: (reg: Registration) => void
	onGuestUnregister: (eventId: string) => void
	onEventUpdate: (event: Event) => void
}

export function useEventActions({
	event,
	guestReg,
	setEvent,
	onRegister,
	onUnregister,
	onGuestRegister,
	onGuestUnregister,
	onEventUpdate,
}: Props) {
	const toast = useToastAction()
	const [loading, setLoading] = useState(false)
	const [guestLoading, setGuestLoading] = useState(false)

	function refreshEvent() {
		fetchEvent(event.id)
			.then(updated => {
				setEvent(updated)
				onEventUpdate(updated)
			})
			.catch(() => {})
	}

	async function registerOnly() {
		setLoading(true)
		try {
			const res = await register(event.id)
			onRegister(event.id, res.status as 'MAIN' | 'RESERVE', res.ticketId)
			toast(res.status === 'MAIN' ? 'Вы записаны!' : 'Вы в резерве')
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function registerWithGuest(guestName: string) {
		setLoading(true)
		try {
			const res = await register(event.id)
			onRegister(event.id, res.status as 'MAIN' | 'RESERVE', res.ticketId)
			try {
				const guestRes = await registerGuest(event.id, guestName)
				onGuestRegister({
					chatId: '',
					eventId: event.id,
					name: guestRes.guestName,
					username: '',
					status: guestRes.status as 'MAIN' | 'RESERVE',
					isGuest: true,
					ticketId: guestRes.ticketId,
				})
				toast(res.status === 'MAIN' ? 'Вы записаны вместе с гостем!' : 'Вы в резерве вместе с гостем!')
			} catch {
				toast(res.status === 'MAIN' ? 'Вы записаны. Гостя не удалось добавить' : 'Вы в резерве. Гостя не удалось добавить')
			}
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function addGuest(guestName: string) {
		setGuestLoading(true)
		try {
			const res = await registerGuest(event.id, guestName)
			onGuestRegister({
				chatId: '',
				eventId: event.id,
				name: res.guestName,
				username: '',
				status: res.status as 'MAIN' | 'RESERVE',
				isGuest: true,
				ticketId: res.ticketId,
			})
			toast('Гость добавлен')
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setGuestLoading(false)
		}
	}

	async function unregisterSelf() {
		setLoading(true)
		try {
			await unregister(event.id)
			onUnregister(event.id)
			toast('Запись отменена')
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function removeGuest() {
		setGuestLoading(true)
		try {
			await unregisterGuest(event.id)
			onGuestUnregister(event.id)
			toast('Гость удалён')
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setGuestLoading(false)
		}
	}

	async function unregisterBoth() {
		setLoading(true)
		try {
			await unregister(event.id)
			onUnregister(event.id)
			if (guestReg) {
				try {
					await unregisterGuest(event.id)
					onGuestUnregister(event.id)
				} catch {}
			}
			toast('Записи отменены')
			refreshEvent()
		} catch (e) {
			toast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return {
		loading,
		guestLoading,
		registerOnly,
		registerWithGuest,
		addGuest,
		unregisterSelf,
		removeGuest,
		unregisterBoth,
		refreshEvent,
	}
}
