import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import { EventCard } from '../components/events/EventCard'
import { EventDetail } from '../components/events/EventDetail'
import type { Event, Registration } from '../types'
import { getTelegramUserId } from '../utils/telegram'
import s from './EventsScreen.module.css'

interface Props {
	onToast: (msg: string) => void
}

export function EventsScreen({ onToast }: Props) {
	const { events, loading, error, isRegistered, getRegStatus, addRegistration, removeRegistration } = useEvents()
	const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

	if (loading) return <div className={s.loading}>Загружаем события...</div>
	if (error) return <div className={s.error}>Ошибка: {error}</div>

	function handleRegister(eventId: string, status: 'MAIN' | 'RESERVE') {
		const reg: Registration = {
			chatId: getTelegramUserId(),
			eventId,
			name: '',
			status,
			isGuest: false,
		}
		addRegistration(reg)
	}

	if (selectedEvent) {
		return (
			<EventDetail
				event={selectedEvent}
				regStatus={isRegistered(selectedEvent.id) ? getRegStatus(selectedEvent.id) : null}
				onRegister={handleRegister}
				onUnregister={removeRegistration}
				onToast={onToast}
				onBack={() => setSelectedEvent(null)}
			/>
		)
	}

	return (
		<div className={s.screen}>
			<div className={s.title}>События</div>
			<div className={s.sub}>Активности экспат-комьюнити Da Nang</div>
			{events.map(event => (
				<EventCard
					key={event.id}
					event={event}
					regStatus={isRegistered(event.id) ? getRegStatus(event.id) : null}
					onClick={() => setSelectedEvent(event)}
				/>
			))}
		</div>
	)
}
