import { Loader } from '../ui/Loader'
import type { Participant } from '../../types'
import s from './EventDetail.module.css'

interface Props {
	participants: Participant[] | undefined
	reserveParticipants: Participant[] | undefined
	reserveLimit: number
	loading: boolean
}

export function ParticipantList({ participants, reserveParticipants, reserveLimit, loading }: Props) {
	if (loading) return <div className={s.participantsLoading}><Loader /></div>

	const hasMain = participants && participants.length > 0
	const hasReserve = reserveParticipants && reserveParticipants.length > 0
	if (!hasMain && !hasReserve) return null

	return (
		<div className={s.participants}>
			{hasMain && (
				<>
					<div className={s.participantsTitle}>Участники</div>
					<ol className={s.participantsList}>
						{participants!.map((p, i) => (
							<li key={i} className={s.participantItem}>
								<span className={s.participantName}>{p.name}</span>
								{p.username && (
									p.isGuest
										? <span className={s.participantGuest}>(гость от {p.username})</span>
										: <span className={s.participantUsername}>{p.username}</span>
								)}
								{p.confirmed && <span className={s.confirmed}>✓</span>}
							</li>
						))}
					</ol>
				</>
			)}
			{hasReserve && (
				<>
					<div className={s.reserveDivider}>
						<span>Резерв {reserveParticipants!.length}/{reserveLimit}</span>
					</div>
					<ol className={s.participantsList}>
						{reserveParticipants!.map((p, i) => (
							<li key={i} className={s.participantItem}>
								<span className={s.participantName}>{p.name}</span>
								{p.username && (
									p.isGuest
										? <span className={s.participantGuest}>(гость от {p.username})</span>
										: <span className={s.participantUsername}>{p.username}</span>
								)}
							</li>
						))}
					</ol>
				</>
			)}
		</div>
	)
}
