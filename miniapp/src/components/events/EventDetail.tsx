import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchEvent } from '../../api/events'
import { register, unregister, registerGuest, unregisterGuest } from '../../api/registrations'
import type { Event, Registration } from '../../types'
import { Loader } from '../ui/Loader'
import { fmt } from '../../utils/format'
import { isAdmin } from '../../utils/telegram'
import { CreateEventSheet } from './CreateEventSheet'
import s from './EventDetail.module.css'

const PAY_LABELS: Record<string, { icon: string; label: string }> = {
	vn:    { icon: '🏦', label: 'Вьетнамский счёт' },
	sbp:   { icon: '📱', label: 'СБП' },
	bybit: { icon: '⚡', label: 'Bybit' },
	cash:  { icon: '💵', label: 'Наличные' },
}

function parsePaymentInfo(raw: string): Record<string, string | boolean> | null {
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch {
		return { _text: raw }
	}
}

interface Props {
	event: Event
	regStatus: 'MAIN' | 'RESERVE' | null
	guestReg: Registration | null
	onRegister: (eventId: string, status: 'MAIN' | 'RESERVE') => void
	onUnregister: (eventId: string) => void
	onGuestRegister: (reg: Registration) => void
	onGuestUnregister: (eventId: string) => void
	onEventUpdate: (event: Event) => void
	onToast: (msg: string) => void
	onBack: () => void
}

export function EventDetail({
	event: initialEvent,
	regStatus,
	guestReg,
	onRegister,
	onUnregister,
	onGuestRegister,
	onGuestUnregister,
	onEventUpdate,
	onToast,
	onBack,
}: Props) {
	const [event, setEvent] = useState<Event>(initialEvent)
	const [loadingDetail, setLoadingDetail] = useState(true)
	const [loading, setLoading] = useState(false)
	const [showSheet, setShowSheet] = useState(false)
	const [sheetGuestName, setSheetGuestName] = useState('')
	const [showGuestCard, setShowGuestCard] = useState(false)
	const [showUnregisterSheet, setShowUnregisterSheet] = useState(false)
	const [showGuestModal, setShowGuestModal] = useState(false)
	const [guestModalName, setGuestModalName] = useState('')
	const [guestLoading, setGuestLoading] = useState(false)
	const [showPaySheet, setShowPaySheet] = useState(false)
	const [payFile, setPayFile] = useState<File | null>(null)
	const [showEdit, setShowEdit] = useState(false)

	const spotsLeft = event.maxPeople === 0
		? Infinity
		: (event.maxPeople + event.reserveLimit) - event.totalCount
	const canRegisterWithGuest = spotsLeft >= 2  // нужно 2 свободных (себя + гость)
	const canAddGuest = event.maxPeople === 0 || spotsLeft >= 1  // уже записан, нужно 1 место для гостя

	useEffect(() => {
		fetchEvent(initialEvent.id)
			.then(setEvent)
			.catch(() => {})
			.finally(() => setLoadingDetail(false))
	}, [initialEvent.id])

	function refreshEvent() {
		fetchEvent(event.id).then(updated => {
			setEvent(updated)
			onEventUpdate(updated)
		}).catch(() => {})
	}

async function handleRegisterOnly() {
		setLoading(true)
		setShowSheet(false)
		try {
			const res = await register(event.id)
			onRegister(event.id, res.status as 'MAIN' | 'RESERVE')
			onToast(res.status === 'MAIN' ? 'Вы записаны!' : 'Вы в резерве')
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function handleRegisterWithGuest() {
		if (!sheetGuestName.trim()) return
		setLoading(true)
		setShowSheet(false)
		try {
			const res = await register(event.id)
			onRegister(event.id, res.status as 'MAIN' | 'RESERVE')
			try {
				const guestRes = await registerGuest(event.id, sheetGuestName.trim())
				onGuestRegister({
					chatId: '',
					eventId: event.id,
					name: guestRes.guestName,
					username: '',
					status: guestRes.status as 'MAIN' | 'RESERVE',
					isGuest: true,
				})
				onToast(res.status === 'MAIN' ? 'Вы записаны вместе с гостем!' : 'Вы в резерве вместе с гостем!')
			} catch {
				onToast(res.status === 'MAIN' ? 'Вы записаны. Гостя не удалось добавить' : 'Вы в резерве. Гостя не удалось добавить')
			}
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
			setSheetGuestName('')
		}
	}

	async function handleAddGuest() {
		if (!guestModalName.trim()) return
		setGuestLoading(true)
		try {
			const res = await registerGuest(event.id, guestModalName.trim())
			onGuestRegister({
				chatId: '',
				eventId: event.id,
				name: res.guestName,
				username: '',
				status: res.status as 'MAIN' | 'RESERVE',
				isGuest: true,
			})
			setShowGuestModal(false)
			setGuestModalName('')
			onToast('Гость добавлен')
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setGuestLoading(false)
		}
	}

	async function handleUnregisterSelf() {
		setShowUnregisterSheet(false)
		setLoading(true)
		try {
			await unregister(event.id)
			onUnregister(event.id)
			onToast('Запись отменена')
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	async function handleUnregisterGuest() {
		setShowUnregisterSheet(false)
		setGuestLoading(true)
		try {
			await unregisterGuest(event.id)
			onGuestUnregister(event.id)
			onToast('Гость удалён')
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setGuestLoading(false)
		}
	}

	async function handleUnregisterBoth() {
		setShowUnregisterSheet(false)
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
			onToast('Записи отменены')
			refreshEvent()
		} catch (e) {
			onToast((e as Error).message)
		} finally {
			setLoading(false)
		}
	}

	function renderButton() {
		if (loading) {
			return (
				<button className={`${s.btn} ${s.btnLoading}`} disabled>
					<Loader />
				</button>
			)
		}

		if (regStatus === 'MAIN') {
			return (
				<div className={s.actionCol}>
					<button
						className={`${s.btn} ${s.btnRegistered}`}
						onClick={() => setShowUnregisterSheet(true)}
						disabled={guestLoading}
					>
						Отменить запись
					</button>
					{guestLoading ? (
						<button className={s.addGuestBtn} disabled><Loader /></button>
					) : !guestReg ? (
						<button className={s.addGuestBtn} onClick={() => setShowGuestModal(true)}>
							+ Гость
						</button>
					) : null}
				</div>
			)
		}

		if (regStatus === 'RESERVE') {
			return (
				<div className={s.actionCol}>
					<button
						className={`${s.btn} ${s.btnReserved}`}
						onClick={() => setShowUnregisterSheet(true)}
						disabled={guestLoading}
					>
						⏳ В резерве — отменить
					</button>
					{guestLoading ? (
						<button className={s.addGuestBtn} disabled><Loader /></button>
					) : !guestReg && canAddGuest ? (
						<button className={s.addGuestBtn} onClick={() => setShowGuestModal(true)}>
							+ Гость
						</button>
					) : null}
				</div>
			)
		}

		if (event.status !== 'Registration_Open') {
			return (
				<button className={`${s.btn} ${s.btnClosed}`} disabled>
					Запись закрыта
				</button>
			)
		}

		if (event.isFull && !event.hasReserve) {
			const primaryBtn = (
				<button className={`${s.btn} ${s.btnFull}`} disabled>
					Мест нет
				</button>
			)
			if (guestReg) {
				return (
					<div className={s.actionCol}>
						{primaryBtn}
						<button className={s.removeGuestBtn} onClick={handleUnregisterGuest} disabled={guestLoading}>
							{guestLoading ? <Loader /> : 'Удалить гостя'}
						</button>
					</div>
				)
			}
			return primaryBtn
		}

		const label = event.isFull && event.hasReserve ? 'Записаться в резерв' : 'Записаться'
		const primaryBtn = (
			<button className={`${s.btn} ${s.btnRegister}`} onClick={() => setShowSheet(true)}>
				{label}
			</button>
		)
		if (guestReg) {
			return (
				<div className={s.actionCol}>
					{primaryBtn}
					<button className={s.removeGuestBtn} onClick={handleUnregisterGuest} disabled={guestLoading}>
						{guestLoading ? <Loader /> : 'Удалить гостя'}
					</button>
				</div>
			)
		}
		return primaryBtn
	}

	const countClass = event.isFull
		? s.countFull
		: event.hasReserve
			? s.countReserve
			: s.count

	const isLocationUrl = event.location?.startsWith('http')

	return (
		<>
		<div className={s.page}>
			<div className={s.header}>
				<button className={s.backBtn} onClick={onBack}>
					←
				</button>
				<div className={s.headerTitle}>Назад</div>
				{isAdmin() && (
					<button className={s.editBtn} onClick={() => setShowEdit(true)}>
						Редактировать
					</button>
				)}
			</div>

			<div className={s.body}>
				{event.type && <div className={s.emoji}>{event.type}</div>}
				<div className={s.title}>{event.title}</div>

				<div className={s.metaRow}>
					<div className={s.meta}>
						<div className={s.metaItem}>📅 {event.date}</div>
						<div className={s.metaItem}>🕐 {event.time}</div>
						{event.location && (
							<div className={s.metaItem}>
								📍{' '}
								{isLocationUrl ? (
									<a
										href={event.location}
										target='_blank'
										rel='noreferrer'
										className={s.locationLink}
									>
										Локация ↗
									</a>
								) : (
									event.location
								)}
							</div>
						)}
					</div>
					<div className={s.action}>{renderButton()}</div>
				</div>


{event.price > 0 && (() => {
					const methods = parsePaymentInfo(event.paymentInfo)
					return (
						<div className={s.paymentBlock}>
							<div className={s.paymentHeader}>
								<div className={s.paymentTitle}>💳 Платное — {fmt(event.price)}</div>
								<button className={s.payBtn} onClick={() => setShowPaySheet(true)}>
									Оплатить
								</button>
							</div>
							{methods && (
								<div className={s.payMethodsList}>
									{Object.entries(methods).map(([key, val]) => {
										if (key === '_text') return (
											<div key={key} className={s.payMethodItem}>
												<span className={s.payMethodText}>{val as string}</span>
											</div>
										)
										const cfg = PAY_LABELS[key]
										if (!cfg) return null
										const copyable = typeof val === 'string' && val
										return (
											<div
												key={key}
												className={`${s.payMethodItem} ${copyable ? s.payMethodItemCopyable : ''}`}
												onClick={() => {
													if (!copyable) return
													navigator.clipboard.writeText(val as string)
														.then(() => onToast('Реквизиты скопированы'))
														.catch(() => onToast('Не удалось скопировать'))
												}}
											>
												<span className={s.payMethodIcon}>{cfg.icon}</span>
												<span className={s.payMethodDetails}>
													<span className={s.payMethodLabel}>{cfg.label}</span>
													{copyable && (
														<span className={s.payMethodValue}>{val as string}</span>
													)}
												</span>
												{copyable && <span className={s.payMethodCopy}>⎘</span>}
											</div>
										)
									})}
								</div>
							)}
						</div>
					)
				})()}

				{event.info && <div className={s.desc}>{event.info}</div>}

				<div className={s.countRow}>
					<span className={countClass}>
						👥&nbsp;
						{event.maxPeople > 0
							? `${event.mainCount} / ${event.maxPeople} человек`
							: `${event.mainCount} участников`}
					</span>
					{event.hasReserve && (
						<span className={s.reserveNote}>резерв открыт</span>
					)}
				</div>

				{loadingDetail ? (
					<div className={s.participantsLoading}>
						<Loader />
					</div>
				) : (event.participants && event.participants.length > 0) || (event.reserveParticipants && event.reserveParticipants.length > 0) ? (
					<div className={s.participants}>
						{event.participants && event.participants.length > 0 && (
							<>
								<div className={s.participantsTitle}>Участники</div>
								<ol className={s.participantsList}>
									{event.participants.map((p, i) => (
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
						{event.reserveParticipants && event.reserveParticipants.length > 0 && (
							<>
								<div className={s.reserveDivider}>
									<span>Резерв {event.reserveParticipants!.length}/{event.reserveLimit}</span>
								</div>
								<ol className={s.participantsList}>
									{event.reserveParticipants.map((p, i) => (
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
				) : null}
			</div>
		</div>

		{showGuestModal && createPortal(
			<>
				<div className={s.sheetBackdrop} onClick={() => { setShowGuestModal(false); setGuestModalName('') }} />
				<div className={s.sheet}>
					<div className={s.sheetTitle}>Добавить гостя</div>
					<input
						className={s.sheetInput}
						placeholder="Имя гостя"
						value={guestModalName}
						onChange={e => setGuestModalName(e.target.value)}
						autoFocus
					/>
					<button
						className={`${s.sheetFullBtn} ${guestLoading ? s.sheetFullBtnLoading : ''}`}
						onClick={handleAddGuest}
						disabled={guestLoading || !guestModalName.trim()}
					>
						{guestLoading ? <Loader /> : 'Добавить'}
					</button>
				</div>
			</>,
			document.body
		)}

		{showUnregisterSheet && createPortal(
			<>
				<div className={s.sheetBackdrop} onClick={() => setShowUnregisterSheet(false)} />
				<div className={s.sheet}>
					<div className={s.sheetTitle}>Отменить запись</div>
					<button className={s.sheetOption} onClick={handleUnregisterSelf} disabled={loading}>
						<span className={s.sheetOptionIcon}>👤</span>
						<span>Только мою запись</span>
					</button>
					{guestReg && (
						<>
							<button className={s.sheetOption} onClick={handleUnregisterGuest} disabled={guestLoading}>
								<span className={s.sheetOptionIcon}>🙋</span>
								<span>Только гостя ({guestReg.name})</span>
							</button>
							<button className={s.sheetOption} onClick={handleUnregisterBoth} disabled={loading}>
								<span className={s.sheetOptionIcon}>👥</span>
								<span>Меня и гостя</span>
							</button>
						</>
					)}
				</div>
			</>,
			document.body
		)}

		{showSheet && createPortal(
			<>
				<div className={s.sheetBackdrop} onClick={() => { setShowSheet(false); setSheetGuestName(''); setShowGuestCard(false) }} />
				<div className={s.sheet}>
					<div className={s.sheetTitle}>Ты будешь один?</div>

					<button className={s.sheetOption} onClick={handleRegisterOnly} disabled={loading}>
						<span className={s.sheetOptionIcon}>👤</span>
						<span>Да, только я</span>
					</button>

					{!guestReg && canRegisterWithGuest && (
						<div
							className={`${s.sheetCard} ${showGuestCard ? s.sheetCardOpen : ''}`}
							onClick={() => { if (!showGuestCard) setShowGuestCard(true) }}
						>
							<div className={s.sheetCardHeader}>
								<span className={s.sheetOptionIcon}>👥</span>
								<span>Я приду с гостем</span>
							</div>
							{showGuestCard && (
								<div className={s.sheetGuestExpanded} onClick={e => e.stopPropagation()}>
									<input
										className={s.sheetInput}
										placeholder="Имя гостя"
										value={sheetGuestName}
										onChange={e => setSheetGuestName(e.target.value)}
										autoFocus
									/>
									<button
										className={`${s.sheetGuestBtn} ${loading ? s.sheetGuestBtnLoading : ''}`}
										onClick={handleRegisterWithGuest}
										disabled={loading || !sheetGuestName.trim()}
									>
										{loading ? <Loader /> : 'Записать'}
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</>,
			document.body
		)}
		{showEdit && (
			<CreateEventSheet
				open={showEdit}
				event={event}
				onUpdated={() => {
					setShowEdit(false)
					refreshEvent()
				}}
				onClose={() => setShowEdit(false)}
				onToast={onToast}
			/>
		)}

		{showPaySheet && createPortal(
			<>
				<div className={s.sheetBackdrop} onClick={() => { setShowPaySheet(false); setPayFile(null) }} />
				<div className={s.sheet}>
					<div className={s.sheetTitle}>Подтверждение оплаты</div>
					<div className={s.paySheetEvent}>{event.title} — {fmt(event.price)}</div>
					<label className={s.payUploadArea}>
						<input
							type="file"
							accept="image/*"
							className={s.payFileInput}
							onChange={e => setPayFile(e.target.files?.[0] ?? null)}
						/>
						{payFile ? (
							<div className={s.payFileName}>📎 {payFile.name}</div>
						) : (
							<>
								<div className={s.payUploadIcon}>📷</div>
								<div className={s.payUploadText}>Загрузить скриншот перевода</div>
							</>
						)}
					</label>
					<button className={s.sheetFullBtn} disabled={!payFile}>
						Отправить
					</button>
				</div>
			</>,
			document.body
		)}
		</>
	)
}
