import { useEffect, useState } from 'react'
import { fetchEvent } from '../../api/events'
import { confirmAttendance } from '../../api/registrations'
import type { Event, Registration } from '../../types'
import { EVENT_STATUS } from '../../types'
import { Loader } from '../ui/Loader'
import { isAdmin } from '../../utils/telegram'
import { useEventActions } from '../../hooks/useEventActions'
import { useToastAction } from '../../context/ToastContext'
import { PaymentBlock } from './PaymentBlock'
import { ParticipantList } from './ParticipantList'
import { RegisterSheet } from './RegisterSheet'
import { UnregisterSheet } from './UnregisterSheet'
import { GuestSheet } from './GuestSheet'
import { PaymentSheet } from './PaymentSheet'
import { CreateEventSheet } from './CreateEventSheet'
import { QrSheet } from './QrSheet'
import s from './EventDetail.module.css'

interface Props {
	event: Event
	regStatus: 'MAIN' | 'RESERVE' | null
	confirmation: string | null
	ticketId: string | null
	guestReg: Registration | null
	onRegister: (eventId: string, status: 'MAIN' | 'RESERVE', ticketId: string) => void
	onUnregister: (eventId: string) => void
	onGuestRegister: (reg: Registration) => void
	onGuestUnregister: (eventId: string) => void
	onEventUpdate: (event: Event) => void
	onConfirmed: () => void
	onBack: () => void
}

export function EventDetail({
	event: initialEvent,
	regStatus,
	confirmation,
	ticketId,
	guestReg,
	onRegister,
	onUnregister,
	onGuestRegister,
	onGuestUnregister,
	onEventUpdate,
	onConfirmed,
	onBack,
}: Props) {
	const [event, setEvent] = useState<Event>(initialEvent)
	const [loadingDetail, setLoadingDetail] = useState(true)
	const [showRegisterSheet, setShowRegisterSheet] = useState(false)
	const [showUnregisterSheet, setShowUnregisterSheet] = useState(false)
	const [showGuestSheet, setShowGuestSheet] = useState(false)
	const [showPaySheet, setShowPaySheet] = useState(false)
	const [showEdit, setShowEdit] = useState(false)
	const [showQrSheet, setShowQrSheet] = useState(false)
	const [confirmLoading, setConfirmLoading] = useState(false)
	const showToast = useToastAction()

	const actions = useEventActions({
		event,
		guestReg,
		setEvent,
		onRegister,
		onUnregister,
		onGuestRegister,
		onGuestUnregister,
		onEventUpdate,
	})

	const spotsLeft = event.maxPeople === 0
		? Infinity
		: (event.maxPeople + event.reserveLimit) - event.totalCount
	const canRegisterWithGuest = spotsLeft >= 2
	const canAddGuest = event.maxPeople === 0 || spotsLeft >= 1

	useEffect(() => {
		fetchEvent(initialEvent.id)
			.then(setEvent)
			.catch(() => {})
			.finally(() => setLoadingDetail(false))
	}, [initialEvent.id])

	function renderButton() {
		if (actions.loading) {
			return <button className={`${s.btn} ${s.btnLoading}`} disabled><Loader /></button>
		}

		if (regStatus === 'MAIN') {
			return (
				<div className={s.actionCol}>
					<button className={`${s.btn} ${s.btnRegistered}`} onClick={() => setShowUnregisterSheet(true)} disabled={actions.guestLoading}>
						Отменить запись
					</button>
					{actions.guestLoading ? (
						<button className={s.addGuestBtn} disabled><Loader /></button>
					) : !guestReg ? (
						<button className={s.addGuestBtn} onClick={() => setShowGuestSheet(true)}>+ Гость</button>
					) : null}
				</div>
			)
		}

		if (regStatus === 'RESERVE') {
			return (
				<div className={s.actionCol}>
					<button className={`${s.btn} ${s.btnReserved}`} onClick={() => setShowUnregisterSheet(true)} disabled={actions.guestLoading}>
						⏳ В резерве — отменить
					</button>
					{actions.guestLoading ? (
						<button className={s.addGuestBtn} disabled><Loader /></button>
					) : !guestReg && canAddGuest ? (
						<button className={s.addGuestBtn} onClick={() => setShowGuestSheet(true)}>+ Гость</button>
					) : null}
				</div>
			)
		}

		if (event.status !== EVENT_STATUS.OPEN) {
			return <button className={`${s.btn} ${s.btnClosed}`} disabled>Запись закрыта</button>
		}

		if (event.isFull && !event.hasReserve) {
			const primaryBtn = <button className={`${s.btn} ${s.btnFull}`} disabled>Мест нет</button>
			if (guestReg) {
				return (
					<div className={s.actionCol}>
						{primaryBtn}
						<button className={s.removeGuestBtn} onClick={actions.removeGuest} disabled={actions.guestLoading}>
							{actions.guestLoading ? <Loader /> : 'Удалить гостя'}
						</button>
					</div>
				)
			}
			return primaryBtn
		}

		const label = event.isFull && event.hasReserve ? 'Записаться в резерв' : 'Записаться'
		const primaryBtn = (
			<button className={`${s.btn} ${s.btnRegister}`} onClick={() => setShowRegisterSheet(true)}>
				{label}
			</button>
		)
		if (guestReg) {
			return (
				<div className={s.actionCol}>
					{primaryBtn}
					<button className={s.removeGuestBtn} onClick={actions.removeGuest} disabled={actions.guestLoading}>
						{actions.guestLoading ? <Loader /> : 'Удалить гостя'}
					</button>
				</div>
			)
		}
		return primaryBtn
	}

	const countClass = event.isFull ? s.countFull : event.hasReserve ? s.countReserve : s.count
	const isLocationUrl = event.location?.startsWith('http')

	return (
		<>
			<div className={s.page}>
				<div className={s.header}>
					<button className={s.backBtn} onClick={onBack}>←</button>
					<div className={s.headerTitle}>Назад</div>
					{isAdmin() && (
						<button className={s.editBtn} onClick={() => setShowEdit(true)}>Редактировать</button>
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
										<a href={event.location} target='_blank' rel='noreferrer' className={s.locationLink}>
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
					{(regStatus === 'MAIN' || regStatus === 'RESERVE') && ticketId && (
						<div className={s.ticketRow}>
							<button className={`${s.btn} ${s.btnQr}`} onClick={() => setShowQrSheet(true)}>
								🎟 Мой QR
							</button>
							{regStatus === 'MAIN' && confirmation === 'Notified' && (
								<button
									className={`${s.btn} ${s.btnConfirm}`}
									disabled={confirmLoading}
									onClick={async () => {
										setConfirmLoading(true)
										try {
											await confirmAttendance(event.id)
											onConfirmed()
											showToast('✅ Участие подтверждено!')
										} finally {
											setConfirmLoading(false)
										}
									}}
								>
									{confirmLoading ? <Loader /> : '✅ Подтвердить'}
								</button>
							)}
						</div>
					)}
					{event.price > 0 && (
						<PaymentBlock
							price={event.price}
							paymentInfo={event.paymentInfo}
							onPayClick={() => setShowPaySheet(true)}
						/>
					)}
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
					<ParticipantList
						participants={event.participants}
						reserveParticipants={event.reserveParticipants}
						reserveLimit={event.reserveLimit}
						loading={loadingDetail}
					/>
				</div>
			</div>

			{showRegisterSheet && (
				<RegisterSheet
					canRegisterWithGuest={canRegisterWithGuest}
					hasGuest={!!guestReg}
					loading={actions.loading}
					onRegisterOnly={() => { setShowRegisterSheet(false); actions.registerOnly() }}
					onRegisterWithGuest={name => { setShowRegisterSheet(false); actions.registerWithGuest(name) }}
					onClose={() => setShowRegisterSheet(false)}
				/>
			)}

			{showUnregisterSheet && (
				<UnregisterSheet
					guestReg={guestReg}
					loading={actions.loading}
					guestLoading={actions.guestLoading}
					onUnregisterSelf={() => { setShowUnregisterSheet(false); actions.unregisterSelf() }}
					onUnregisterGuest={() => { setShowUnregisterSheet(false); actions.removeGuest() }}
					onUnregisterBoth={() => { setShowUnregisterSheet(false); actions.unregisterBoth() }}
					onClose={() => setShowUnregisterSheet(false)}
				/>
			)}

			{showGuestSheet && (
				<GuestSheet
					loading={actions.guestLoading}
					onAdd={name => { setShowGuestSheet(false); actions.addGuest(name) }}
					onClose={() => setShowGuestSheet(false)}
				/>
			)}

			{showPaySheet && (
				<PaymentSheet
					title={event.title}
					price={event.price}
					onClose={() => setShowPaySheet(false)}
				/>
			)}

			{showEdit && (
				<CreateEventSheet
					open={showEdit}
					event={event}
					onUpdated={() => { setShowEdit(false); actions.refreshEvent() }}
					onClose={() => setShowEdit(false)}
				/>
			)}

			{showQrSheet && ticketId && (
				<QrSheet
					ticketId={ticketId}
					guestTicketId={guestReg?.ticketId}
					eventTitle={event.title}
					onClose={() => setShowQrSheet(false)}
				/>
			)}
		</>
	)
}
