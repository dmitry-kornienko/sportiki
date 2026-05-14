import type { Event } from '../../types'
import { getDayOfWeek } from '../../utils/format'
import s from './EventCard.module.css'

interface Props {
	event: Event
	regStatus: 'MAIN' | 'RESERVE' | null
	onClick: () => void
}

export function EventCard({ event, regStatus, onClick }: Props) {
	const countClass = event.isFull
		? s.countFull
		: event.hasReserve
			? s.countReserve
			: s.count

	return (
		<div
			className={`${s.card} ${regStatus ? s.cardRegistered : ''}`}
			onClick={onClick}
		>
			<div className={s.info}>
				<div className={s.titleRow}>
					<div className={s.title}>{event.title}</div>
					{event.price > 0 && <span className={s.paidBadge}>$</span>}
				</div>
				<div className={s.meta}>
					<span>{getDayOfWeek(event.date)} {event.date}</span>
					<span>{event.time}</span>
				</div>
			</div>

			<div className={s.right}>
				<div className={countClass}>
					Участники{' '}
					{event.maxPeople > 0
						? `${event.mainCount}/${event.maxPeople}`
						: event.mainCount}
				</div>
				{!regStatus && event.isFull && event.reserveLimit > 0 && (
					<div className={event.hasReserve ? s.reserveCount : s.reserveCountFull}>
						Резерв {event.totalCount - event.mainCount}/{event.reserveLimit}
					</div>
				)}
				<div className={s.badgeArea}>
					{regStatus === 'MAIN' && <div className={s.badge}>✓ Записан</div>}
					{regStatus === 'RESERVE' && (
						<div className={s.badgeReserve}>⏳ Резерв</div>
					)}
				</div>
			</div>
		</div>
	)
}
