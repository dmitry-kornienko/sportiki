import type { Event } from '../../types'
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
				<div className={s.title}>{event.title}</div>
				<div className={s.meta}>
					<span>{event.date}</span>
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
