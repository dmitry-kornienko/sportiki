import { useState } from 'react'
import { getTicket, checkin as checkinApi } from '../api/registrations'
import { Loader } from '../components/ui/Loader'
import type { TicketData } from '../types'
import s from './ScannerScreen.module.css'

type Mode = 'entry' | 'points'
type ScanState = 'idle' | 'loading' | 'result' | 'checkin-loading' | 'done' | 'error'

const PAYMENT_LABELS: Record<string, string> = {
	Confirmed: 'Оплачено',
	Pending: 'Ожидает',
}

export function ScannerScreen() {
	const [mode, setMode] = useState<Mode>('entry')
	const [scanState, setScanState] = useState<ScanState>('idle')
	const [ticket, setTicket] = useState<TicketData | null>(null)
	const [errorMsg, setErrorMsg] = useState('')

	function startScan() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const tg = (window as any).Telegram?.WebApp
		if (tg?.showScanQrPopup) {
			tg.showScanQrPopup({ text: 'Наведи камеру на QR-код билета' }, (data: string) => {
				tg.closeScanQrPopup()
				handleScanned(data.trim())
				return true
			})
		} else {
			handleScanned('TEST000000AA')
		}
	}

	async function handleScanned(ticketId: string) {
		setScanState('loading')
		setTicket(null)
		setErrorMsg('')
		try {
			const data = await getTicket(ticketId)
			setTicket(data)
			setScanState('result')
		} catch (e) {
			setErrorMsg((e as Error).message)
			setScanState('error')
		}
	}

	async function handleCheckin() {
		if (!ticket) return
		setScanState('checkin-loading')
		try {
			const res = await checkinApi(ticket.ticketId)
			setTicket({ ...ticket, checkedInAt: res.checkedInAt, stats: res.stats })
			setScanState('done')
		} catch (e) {
			setErrorMsg((e as Error).message)
			setScanState('error')
		}
	}

	function reset() {
		setScanState('idle')
		setTicket(null)
		setErrorMsg('')
	}

	function switchMode(m: Mode) {
		setMode(m)
		reset()
	}

	return (
		<div className={s.screen}>
			<div className={s.titleRow}>
				<div className={s.title}>Сканер</div>
			</div>

			<div className={s.tabs}>
				<button className={`${s.tab} ${mode === 'entry' ? s.tabActive : ''}`} onClick={() => switchMode('entry')}>
					🎫 Вход
				</button>
				<button className={`${s.tab} ${mode === 'points' ? s.tabActive : ''}`} onClick={() => switchMode('points')}>
					⭐ Баллы
				</button>
			</div>

			{mode === 'entry' && (
				<>
					{scanState === 'idle' && (
						<div className={s.center}>
							<div className={s.bigIcon}>📷</div>
							<div className={s.hint}>Сканируй QR-код билета участника</div>
							<button className={s.scanBtn} onClick={startScan}>Сканировать</button>
						</div>
					)}

					{scanState === 'loading' && (
						<div className={s.center}><Loader /></div>
					)}

					{scanState === 'error' && (
						<div className={s.center}>
							<div className={s.errorCard}>{errorMsg || 'Билет не найден'}</div>
							<button className={s.scanBtn} onClick={reset}>Попробовать снова</button>
						</div>
					)}

					{ticket && (scanState === 'result' || scanState === 'checkin-loading' || scanState === 'done') && (
						<div className={s.resultWrap}>
							<TicketCard ticket={ticket} />

							{scanState === 'result' && !ticket.checkedInAt && (
								<button className={s.checkinBtn} onClick={handleCheckin}>
									✅ Подтвердить проход
								</button>
							)}
							{scanState === 'checkin-loading' && (
								<button className={s.checkinBtn} disabled><Loader /></button>
							)}
							{(scanState === 'done' || (scanState === 'result' && ticket.checkedInAt)) && (
								<div className={s.alreadyUsed}>
									{scanState === 'done' ? '✅ Проход подтверждён!' : `⚠️ Билет уже использован — ${ticket.checkedInAt}`}
								</div>
							)}

							<button className={s.scanAgainBtn} onClick={reset}>← Сканировать ещё</button>
						</div>
					)}
				</>
			)}

			{mode === 'points' && (
				<div className={s.center}>
					<div className={s.bigIcon}>⭐</div>
					<div className={s.hint}>Начисление баллов за участие в активностях</div>
					<div className={s.comingSoon}>Скоро</div>
				</div>
			)}
		</div>
	)
}

function TicketCard({ ticket }: { ticket: TicketData }) {
	const payLabel = PAYMENT_LABELS[ticket.paymentStatus] ?? null
	const isAlreadyUsed = !!ticket.checkedInAt

	return (
		<div className={`${s.card} ${isAlreadyUsed ? s.cardUsed : ''}`}>
			<div className={s.cardEvent}>
				{ticket.eventType && <span>{ticket.eventType} </span>}
				{ticket.eventTitle}
			</div>
			<div className={s.cardMeta}>
				<span>📅 {ticket.eventDate}</span>
				<span>🕐 {ticket.eventTime}</span>
			</div>

			<div className={s.cardDivider} />

			<div className={s.cardRow}>
				<span className={s.cardLabel}>Участник</span>
				<span className={s.cardValue}>
					{ticket.participantName}
					{ticket.isGuest && <span className={s.guestTag}> (гость)</span>}
				</span>
			</div>
			{ticket.username && (
				<div className={s.cardRow}>
					<span className={s.cardLabel}>Telegram</span>
					<span className={s.cardValue}>{ticket.username}</span>
				</div>
			)}
			<div className={s.cardRow}>
				<span className={s.cardLabel}>Статус</span>
				<span className={`${s.badge} ${ticket.status === 'MAIN' ? s.badgeMain : s.badgeReserve}`}>
					{ticket.status === 'MAIN' ? 'Основной' : 'Резерв'}
				</span>
			</div>
			<div className={s.cardRow}>
				<span className={s.cardLabel}>Оплата</span>
				{payLabel
					? <span className={`${s.badge} ${ticket.paymentStatus === 'Confirmed' ? s.badgePaid : s.badgePending}`}>{payLabel}</span>
					: <span className={s.cardValueMuted}>—</span>}
			</div>
			<div className={s.cardRow}>
				<span className={s.cardLabel}>Проход</span>
				{isAlreadyUsed
					? <span className={`${s.badge} ${s.badgeUsed}`}>{ticket.checkedInAt}</span>
					: <span className={s.cardValueMuted}>Не проходил</span>}
			</div>

			<div className={s.cardDivider} />

			<div className={s.statsRow}>
				<div className={s.statItem}>
					<span className={s.statLabel}>👥 Записалось</span>
					<span className={s.statValue}>{ticket.stats.registered}</span>
				</div>
				<div className={s.statDivider} />
				<div className={s.statItem}>
					<span className={s.statLabel}>✅ Прошли</span>
					<span className={s.statValue}>
						{ticket.stats.checkedIn}
						<span className={s.statTotal}> / {ticket.stats.registered}</span>
					</span>
				</div>
			</div>
		</div>
	)
}
