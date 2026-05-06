import { useState } from 'react'
import type { Event } from '../../types'
import { register, unregister } from '../../api/registrations'
import s from './EventCard.module.css'

interface Props {
	event: Event
	regStatus: 'MAIN' | 'RESERVE' | null
	onRegister: (eventId: string, status: 'MAIN' | 'RESERVE') => void
	onUnregister: (eventId: string) => void
	onToast: (msg: string) => void
}

export function EventCard({ event, regStatus, onRegister, onUnregister, onToast }: Props) {
	const [loading, setLoading] = useState(false)

	async function handleRegister() {
		setLoading(true)
		try {
			const res = await register(event.id)
			onRegister(event.id, res.status as 'MAIN' | 'RESERVE')
			onToast(res.status === 'MAIN' ? 'Вы записаны!' : 'Вы в резерве')
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function handleUnregister() {
		setLoading(true)
		try {
			await unregister(event.id)
			onUnregister(event.id)
			onToast('Запись отменена')
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	function renderButton() {
		if (regStatus === 'MAIN') {
			return (
				<button className={`${s.btn} ${s.btnRegistered}`} onClick={handleUnregister} disabled={loading}>
					✓ Записан
				</button>
			)
		}
		if (regStatus === 'RESERVE') {
			return (
				<button className={`${s.btn} ${s.btnReserved}`} onClick={handleUnregister} disabled={loading}>
					⏳ Резерв
				</button>
			)
		}
		if (event.isFull && !event.hasReserve) {
			return <button className={`${s.btn} ${s.btnFull}`} disabled>Мест нет</button>
		}
		if (event.isFull && event.hasReserve) {
			return (
				<button className={`${s.btn} ${s.btnReserve}`} onClick={handleRegister} disabled={loading}>
					В резерв
				</button>
			)
		}
		return (
			<button className={`${s.btn} ${s.btnRegister}`} onClick={handleRegister} disabled={loading}>
				Записаться
			</button>
		)
	}

	const countClass = event.isFull
		? s.countFull
		: event.hasReserve
			? s.countReserve
			: s.count

	return (
		<div className={s.card}>
			<div className={s.top}>
				<div className={s.emoji}>{event.type}</div>
				<div className={s.info}>
					<div className={s.title}>{event.title}</div>
					<div className={s.meta}>
						<span className={s.metaItem}>📅 {event.date}</span>
						<span className={s.metaItem}>🕐 {event.time}</span>
					</div>
				</div>
			</div>

			{event.info && <div className={s.desc}>{event.info}</div>}

			<div className={s.footer}>
				<div className={countClass}>
					{event.maxPeople > 0
						? `${event.mainCount} / ${event.maxPeople} чел.`
						: `${event.mainCount} участников`}
				</div>
				{renderButton()}
			</div>
		</div>
	)
}
