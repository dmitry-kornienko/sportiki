import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Event } from '../../types'
import { register, unregister } from '../../api/registrations'
import s from './EventDetail.module.css'

interface Props {
	event: Event
	regStatus: 'MAIN' | 'RESERVE' | null
	onRegister: (eventId: string, status: 'MAIN' | 'RESERVE') => void
	onUnregister: (eventId: string) => void
	onToast: (msg: string) => void
	onBack: () => void
}

export function EventDetail({ event, regStatus, onRegister, onUnregister, onToast, onBack }: Props) {
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
					✓ Записан — отменить запись
				</button>
			)
		}
		if (regStatus === 'RESERVE') {
			return (
				<button className={`${s.btn} ${s.btnReserved}`} onClick={handleUnregister} disabled={loading}>
					⏳ В резерве — отменить
				</button>
			)
		}
		if (event.isFull && !event.hasReserve) {
			return <button className={`${s.btn} ${s.btnFull}`} disabled>Мест нет</button>
		}
		if (event.isFull && event.hasReserve) {
			return (
				<button className={`${s.btn} ${s.btnReserve}`} onClick={handleRegister} disabled={loading}>
					Записаться в резерв
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

	return createPortal(
		<div className={s.overlay}>
			<div className={s.header}>
				<button className={s.backBtn} onClick={onBack}>←</button>
				<div className={s.headerTitle}>{event.title}</div>
			</div>

			<div className={s.body}>
				<div className={s.emoji}>{event.type}</div>
				<div className={s.title}>{event.title}</div>

				<div className={s.meta}>
					<div className={s.metaItem}>📅 {event.date}</div>
					<div className={s.metaItem}>🕐 {event.time}</div>
					{event.location && <div className={s.metaItem}>📍 {event.location}</div>}
				</div>

				{event.info && <div className={s.desc}>{event.info}</div>}

				<div className={s.countRow}>
					<span className={countClass}>
						👥&nbsp;
						{event.maxPeople > 0
							? `${event.mainCount} / ${event.maxPeople} человек`
							: `${event.mainCount} участников`}
					</span>
					{event.hasReserve && <span className={s.reserveNote}>резерв открыт</span>}
				</div>

				{renderButton()}
			</div>
		</div>,
		document.body
	)
}
