import { useState } from 'react'
import { useEvents } from '../hooks/useEvents'
import { EventCard } from '../components/events/EventCard'
import { EventDetail } from '../components/events/EventDetail'
import { CreateEventSheet } from '../components/events/CreateEventSheet'
import { Loader } from '../components/ui/Loader'
import type { Event, Registration } from '../types'
import { getTelegramUserId, isAdmin } from '../utils/telegram'
import s from './EventsScreen.module.css'

interface Props {
	initialEventId?: string
}

export function EventsScreen({ initialEventId }: Props) {
	const { events, loading, error, isRegistered, getRegStatus, getGuestReg, getConfirmation, setConfirmationLocal, addEvent, addRegistration, removeRegistration, removeGuestRegistration, updateEvent } = useEvents()
	const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
	const [dismissedInitial, setDismissedInitial] = useState(false)
	const [showCreate, setShowCreate] = useState(false)

	if (loading) return <Loader fullscreen />
	if (error) return <div className={s.error}>Ошибка: {error}</div>

	const activeEvent = selectedEvent
		?? (!dismissedInitial && initialEventId ? (events.find(e => e.id === initialEventId) ?? null) : null)

	function handleRegister(eventId: string, status: 'MAIN' | 'RESERVE') {
		const reg: Registration = {
			chatId: getTelegramUserId(),
			eventId,
			name: '',
			username: '',
			status,
			isGuest: false,
		}
		addRegistration(reg)
	}

	if (activeEvent) {
		return (
			<EventDetail
				event={activeEvent}
				regStatus={isRegistered(activeEvent.id) ? getRegStatus(activeEvent.id) : null}
				confirmation={getConfirmation(activeEvent.id)}
				guestReg={getGuestReg(activeEvent.id)}
				onRegister={handleRegister}
				onUnregister={removeRegistration}
				onGuestRegister={reg => addRegistration(reg)}
				onGuestUnregister={eventId => removeGuestRegistration(eventId)}
				onEventUpdate={updateEvent}
				onConfirmed={() => setConfirmationLocal(activeEvent.id)}
				onBack={() => { setSelectedEvent(null); setDismissedInitial(true) }}
			/>
		)
	}

	return (
		<>
			<div className={s.screen}>
				<div className={s.titleRow}>
					<div className={s.title}>События</div>
					{isAdmin() && (
						<button className={s.addBtn} onClick={() => setShowCreate(true)}>+ Создать</button>
					)}
				</div>
				<div className={s.sub}>Активности экспат-комьюнити Da Nang</div>
				{events.map(event => (
					<EventCard
						key={event.id}
						event={event}
						regStatus={isRegistered(event.id) ? (getRegStatus(event.id) ?? getGuestReg(event.id)?.status ?? null) : null}
						onClick={() => { setSelectedEvent(event); setDismissedInitial(true) }}
					/>
				))}
			</div>
			{showCreate && (
				<CreateEventSheet
					open={showCreate}
					onCreated={addEvent}
					onClose={() => setShowCreate(false)}
				/>
			)}
		</>
	)
}
