import { useEffect, useState } from 'react'
import { fetchEvent } from '../../api/events'
import { register, unregister, registerGuest, unregisterGuest } from '../../api/registrations'
import type { Event, Registration } from '../../types'
import { Loader } from '../ui/Loader'
import s from './EventDetail.module.css'

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

	async function handleRegister() {
		setLoading(true)
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

	async function handleUnregister() {
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
			if (res.status === 'MAIN') {
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
					onToast('Вы записаны вместе с гостем!')
				} catch {
					onToast('Вы записаны. Гостя не удалось добавить')
				}
			} else {
				onToast('Вы в резерве')
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
		let primaryBtn
		if (regStatus === 'RESERVE') {
			primaryBtn = (
				<button className={`${s.btn} ${s.btnReserved}`} onClick={handleUnregister}>
					⏳ В резерве — отменить
				</button>
			)
		} else if (event.isFull && !event.hasReserve) {
			primaryBtn = (
				<button className={`${s.btn} ${s.btnFull}`} disabled>
					Мест нет
				</button>
			)
		} else if (event.isFull && event.hasReserve) {
			primaryBtn = (
				<button className={`${s.btn} ${s.btnReserve}`} onClick={handleRegister}>
					Записаться в резерв
				</button>
			)
		} else {
			primaryBtn = (
				<button className={`${s.btn} ${s.btnRegister}`} onClick={() => setShowSheet(true)}>
					Записаться
				</button>
			)
		}

		if (guestReg) {
			return (
				<div className={s.actionCol}>
					{primaryBtn}
					<button
						className={s.removeGuestBtn}
						onClick={handleUnregisterGuest}
						disabled={guestLoading}
					>
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
				) : event.participants && event.participants.length > 0 ? (
					<div className={s.participants}>
						<div className={s.participantsTitle}>Участники</div>
						<ol className={s.participantsList}>
							{event.participants.map((p, i) => (
								<li key={i} className={s.participantItem}>
									{p.isGuest ? (
										<span className={s.participantName}>
											{p.name}
											{p.username && (
												<span className={s.participantGuest}> (гость от {p.username})</span>
											)}
										</span>
									) : (
										<>
											<span className={s.participantName}>{p.name}</span>
											{p.username && (
												<span className={s.participantUsername}>{p.username}</span>
											)}
										</>
									)}
									{p.confirmed && <span className={s.confirmed}>✓</span>}
								</li>
							))}
						</ol>
					</div>
				) : null}
			</div>
		</div>

		{showGuestModal && (
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
			</>
		)}

		{showUnregisterSheet && (
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
			</>
		)}

		{showSheet && (
			<>
				<div className={s.sheetBackdrop} onClick={() => { setShowSheet(false); setSheetGuestName(''); setShowGuestCard(false) }} />
				<div className={s.sheet}>
					<div className={s.sheetTitle}>Ты будешь один?</div>

					<button className={s.sheetOption} onClick={handleRegisterOnly} disabled={loading}>
						<span className={s.sheetOptionIcon}>👤</span>
						<span>Да, только я</span>
					</button>

					{!guestReg && (
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
			</>
		)}
		</>
	)
}
