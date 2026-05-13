import { Loader } from '../ui/Loader'
import type { Participant } from '../../types'
import s from './EventDetail.module.css'

interface Props {
	participants: Participant[] | undefined
	reserveParticipants: Participant[] | undefined
	reserveLimit: number
	loading: boolean
}

function UsernameLink({ username }: { username: string }) {
	const handle = username.startsWith('@') ? username.slice(1) : username
	const tg = window.Telegram?.WebApp
	return (
		<span
			className={s.participantUsername}
			onClick={() => tg?.openTelegramLink(`https://t.me/${handle}`)}
			style={{ cursor: 'pointer' }}
		>
			{username.startsWith('@') ? username : `@${username}`}
		</span>
	)
}

function ParticipantItem({ p }: { p: Participant }) {
	return (
		<li className={s.participantItem}>
			<span className={s.participantName}>{p.name}</span>
			{p.username && (
				p.isGuest
					? <span className={s.participantGuest}>(гость от <UsernameLink username={p.username} />)</span>
					: <UsernameLink username={p.username} />
			)}
			{(p.confirmed || p.paymentConfirmed) && (
				<span className={s.participantBadges}>
					{p.confirmed && <span className={s.confirmed}>✓</span>}
					{p.paymentConfirmed && <span className={s.payConfirmedBadge}>$</span>}
				</span>
			)}
		</li>
	)
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
						{participants!.map((p, i) => <ParticipantItem key={i} p={p} />)}
					</ol>
				</>
			)}
			{hasReserve && (
				<>
					<div className={s.reserveDivider}>
						<span>Резерв {reserveParticipants!.length}/{reserveLimit}</span>
					</div>
					<ol className={s.participantsList}>
						{reserveParticipants!.map((p, i) => <ParticipantItem key={i} p={p} />)}
					</ol>
				</>
			)}
		</div>
	)
}
