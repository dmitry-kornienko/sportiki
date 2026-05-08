import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createEvent, updateEvent } from '../../api/events'
import type { Event, Participant } from '../../types'
import { fmt } from '../../utils/format'
import { Loader } from '../ui/Loader'
import s from './CreateEventSheet.module.css'

interface Props {
	open: boolean
	event?: Event
	onCreated?: (event: Event) => void
	onUpdated?: (event: Event) => void
	onClose: () => void
	onToast: (msg: string) => void
}

const DEFAULT_RESERVE_LIMIT = 3

const EVENT_STATUSES = [
	{ value: 'Registration_Open',   label: 'Открыта запись' },
	{ value: 'Registration_Closed', label: 'Запись закрыта' },
	{ value: 'Archived',            label: 'Архив' },
]

const EMPTY_FORM = {
	type: '',
	title: '',
	date: '',
	time: '',
	maxPeople: '0',
	reserveLimit: String(DEFAULT_RESERVE_LIMIT),
	price: '0',
	info: '',
	location: '',
}

interface PayMethods {
	vn: { enabled: boolean; value: string }
	sbp: { enabled: boolean; value: string }
	bybit: { enabled: boolean; value: string }
	cash: boolean
}

const EMPTY_PAY: PayMethods = {
	vn: { enabled: false, value: '' },
	sbp: { enabled: false, value: '' },
	bybit: { enabled: false, value: '' },
	cash: false,
}

const PAY_CONFIG = [
	{
		key: 'vn' as const,
		icon: '🏦',
		label: 'Вьетнамский счёт',
		placeholder: 'Номер счёта, банк (Vietcombank 1234...)',
	},
	{
		key: 'sbp' as const,
		icon: '📱',
		label: 'СБП',
		placeholder: '+7 999 123 45 67',
	},
	{
		key: 'bybit' as const,
		icon: '⚡',
		label: 'Bybit',
		placeholder: 'UID или ссылка на кошелёк',
	},
]

function isValidPhone(value: string): boolean {
	const digits = value.replace(/[\s\-()]/g, '')
	return /^(\+7|7|8)\d{10}$/.test(digits)
}

function serializePay(pay: PayMethods): string {
	const result: Record<string, string | boolean> = {}
	if (pay.vn.enabled && pay.vn.value.trim()) result.vn = pay.vn.value.trim()
	if (pay.sbp.enabled && pay.sbp.value.trim()) result.sbp = pay.sbp.value.trim()
	if (pay.bybit.enabled && pay.bybit.value.trim())
		result.bybit = pay.bybit.value.trim()
	if (pay.cash) result.cash = true
	return Object.keys(result).length > 0 ? JSON.stringify(result) : ''
}

function dateToInput(date: string): string {
	if (!date) return ''
	const [d, m, y] = date.split('.')
	if (!d || !m || !y) return ''
	return `${y}-${m}-${d}`
}

function eventToForm(event: Event): typeof EMPTY_FORM {
	return {
		type: event.type || '',
		title: event.title || '',
		date: dateToInput(event.date),
		time: event.time || '',
		maxPeople: String(event.maxPeople ?? 0),
		reserveLimit: String(event.reserveLimit ?? DEFAULT_RESERVE_LIMIT),
		price: String(event.price ?? 0),
		info: event.info || '',
		location: event.location || '',
	}
}

interface ImpactData {
	promotedNames: string[]
	demotedNames: string[]
	deletedNames: string[]
}

function calcImpact(event: Event, newMaxPeople: number, newReserveLimit: number): ImpactData | null {
	if (newMaxPeople === 0) return null

	const mainCount = event.mainCount
	const mainList: Participant[] = event.participants || []
	const reserveList: Participant[] = event.reserveParticipants || []
	const reserveCount = reserveList.length

	const promotedNames: string[] = []
	const demotedNames: string[] = []
	const deletedNames: string[] = []

	if (newMaxPeople > mainCount) {
		const toPromote = Math.min(reserveCount, newMaxPeople - mainCount)
		promotedNames.push(...reserveList.slice(0, toPromote).map(p => p.name))
		const remaining = reserveList.slice(toPromote)
		if (remaining.length > newReserveLimit) {
			deletedNames.push(...remaining.slice(newReserveLimit).map(p => p.name))
		}
	} else if (newMaxPeople < mainCount) {
		const toDemote = mainCount - newMaxPeople
		demotedNames.push(...mainList.slice(-toDemote).map(p => p.name))
		const fullReserveAfter = [...mainList.slice(-toDemote), ...reserveList]
		if (fullReserveAfter.length > newReserveLimit) {
			deletedNames.push(...fullReserveAfter.slice(newReserveLimit).map(p => p.name))
		}
	} else {
		if (reserveCount > newReserveLimit) {
			deletedNames.push(...reserveList.slice(newReserveLimit).map(p => p.name))
		}
	}

	if (promotedNames.length === 0 && demotedNames.length === 0 && deletedNames.length === 0) return null
	return { promotedNames, demotedNames, deletedNames }
}

function parsePay(raw: string): PayMethods {
	if (!raw) return EMPTY_PAY
	try {
		const data = JSON.parse(raw) as Record<string, unknown>
		return {
			vn:    { enabled: !!data.vn,    value: typeof data.vn === 'string' ? data.vn : '' },
			sbp:   { enabled: !!data.sbp,   value: typeof data.sbp === 'string' ? data.sbp : '' },
			bybit: { enabled: !!data.bybit, value: typeof data.bybit === 'string' ? data.bybit : '' },
			cash:  !!data.cash,
		}
	} catch {
		return EMPTY_PAY
	}
}

type Payload = {
	type: string; title: string; date: string; time: string
	maxPeople: number; reserveLimit: number; price: number
	paymentInfo: string; info: string; location: string
	status?: string
}

export function CreateEventSheet({ open, event, onCreated, onUpdated, onClose, onToast }: Props) {
	const isEdit = !!event
	const [form, setForm] = useState(() => event ? eventToForm(event) : EMPTY_FORM)
	const [pay, setPay] = useState<PayMethods>(() => event ? parsePay(event.paymentInfo) : EMPTY_PAY)
	const [status, setStatus] = useState(() => event?.status || 'Registration_Open')
	const [loading, setLoading] = useState(false)
	const [visible, setVisible] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [impact, setImpact] = useState<ImpactData | null>(null)
	const [pendingPayload, setPendingPayload] = useState<Payload | null>(null)

	useEffect(() => {
		if (open) requestAnimationFrame(() => setVisible(true))
		else setVisible(false)
	}, [open])

	function setField(field: keyof typeof EMPTY_FORM, value: string) {
		setForm(prev => ({ ...prev, [field]: value }))
	}

	function togglePay(key: 'vn' | 'sbp' | 'bybit', enabled: boolean) {
		setPay(prev => ({ ...prev, [key]: { ...prev[key], enabled } }))
	}

	function setPayValue(key: 'vn' | 'sbp' | 'bybit', value: string) {
		setPay(prev => ({ ...prev, [key]: { ...prev[key], value } }))
	}

	function handleClose() {
		setForm(isEdit ? eventToForm(event!) : EMPTY_FORM)
		setPay(isEdit ? parsePay(event!.paymentInfo) : EMPTY_PAY)
		setStatus(event?.status || 'Registration_Open')
		onClose()
	}

	function buildPayload(): Payload | null {
		const [y, m, d] = form.date.split('-')
		const apiDate = `${d}.${m}.${y}`
		const maxPeople = parseInt(form.maxPeople) || 0
		const reserveLimit = maxPeople > 0 ? parseInt(form.reserveLimit) || DEFAULT_RESERVE_LIMIT : 0
		const price = parseInt(form.price) || 0

		if (price > 0) {
			const invalid = PAY_CONFIG.find(({ key }) => pay[key].enabled && !pay[key].value.trim())
			if (invalid) { onToast(`Укажите данные для: ${invalid.label}`); return null }
			const anySelected = PAY_CONFIG.some(({ key }) => pay[key].enabled) || pay.cash
			if (!anySelected) { onToast('Выберите хотя бы один способ оплаты'); return null }
			if (pay.sbp.enabled && !isValidPhone(pay.sbp.value)) {
				onToast('СБП: введите корректный номер телефона (+7XXXXXXXXXX)')
				return null
			}
		}

		return {
			type: form.type,
			title: form.title,
			date: apiDate,
			time: form.time,
			maxPeople,
			reserveLimit,
			price,
			paymentInfo: price > 0 ? serializePay(pay) : '',
			info: form.info,
			location: form.location,
			...(isEdit ? { status } : {}),
		}
	}

	async function doSave(payload: Payload) {
		setLoading(true)
		try {
			if (isEdit) {
				await updateEvent({ id: event!.id, status: payload.status!, ...payload })
				const updated: Event = {
					...event!,
					...payload,
					status: payload.status!,
					isFull: payload.maxPeople > 0 && event!.mainCount >= payload.maxPeople,
					hasReserve: payload.maxPeople > 0 && payload.reserveLimit > 0,
				}
				onUpdated?.(updated)
				onToast('Изменения сохранены')
			} else {
				const result = await createEvent(payload)
				const newEvent: Event = {
					id: result.id,
					...payload,
					status: 'Registration_Open',
					mainCount: 0,
					totalCount: 0,
					isFull: false,
					hasReserve: payload.maxPeople > 0 && payload.reserveLimit > 0,
				}
				onCreated?.(newEvent)
				onToast('Событие создано')
			}
			handleClose()
		} catch (err) {
			onToast((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (loading) return

		const payload = buildPayload()
		if (!payload) return

		if (isEdit) {
			const imp = calcImpact(event!, payload.maxPeople, payload.reserveLimit)
			if (imp) {
				setImpact(imp)
				setPendingPayload(payload)
				setShowConfirm(true)
				return
			}
		}

		void doSave(payload)
	}

	function handleConfirm() {
		setShowConfirm(false)
		if (pendingPayload) void doSave(pendingPayload)
	}

	const price = parseInt(form.price) || 0

	return createPortal(
		<div className={`${s.overlay} ${visible ? s.active : ''}`}>
			<div className={s.header}>
				<button className={s.backBtn} onClick={handleClose} type='button'>
					←
				</button>
				<span className={s.headerTitle}>{isEdit ? 'Редактировать' : 'Новое событие'}</span>
			</div>
			<form className={s.body} onSubmit={handleSubmit}>
				<div className={s.field}>
					<label className={s.label}>Тип (эмодзи)</label>
					<input
						className={s.input}
						type='text'
						placeholder='⚽ 🚴 🧘 🎉'
						value={form.type}
						onChange={e => setField('type', e.target.value)}
						required
					/>
				</div>
				<div className={s.field}>
					<label className={s.label}>Название</label>
					<input
						className={s.input}
						type='text'
						placeholder='Велозаезд по горному маршруту'
						value={form.title}
						onChange={e => setField('title', e.target.value)}
						required
					/>
				</div>
				<div className={s.row}>
					<div className={s.field}>
						<label className={s.label}>Дата</label>
						<input
							className={s.input}
							type='date'
							value={form.date}
							onChange={e => setField('date', e.target.value)}
							required
						/>
					</div>
					<div className={s.field}>
						<label className={s.label}>Время</label>
						<input
							className={s.input}
							type='time'
							value={form.time}
							onChange={e => setField('time', e.target.value)}
							required
						/>
					</div>
				</div>
				<div className={s.row}>
					<div className={s.field}>
						<label className={s.label}>Мест (0 = без лимита)</label>
						<input
							className={s.input}
							type='number'
							min='0'
							value={form.maxPeople}
							onChange={e => setField('maxPeople', e.target.value)}
							required
						/>
					</div>
					{parseInt(form.maxPeople) > 0 && (
						<div className={s.field}>
							<label className={s.label}>Резерв</label>
							<input
								className={s.input}
								type='number'
								min='0'
								value={form.reserveLimit}
								onChange={e => setField('reserveLimit', e.target.value)}
							/>
						</div>
					)}
				</div>

				<div className={s.field}>
					<label className={s.label}>Стоимость (0 = бесплатно), ₫</label>
					<input
						className={s.input}
						type='number'
						min='0'
						step='1000'
						value={form.price}
						onChange={e => setField('price', e.target.value)}
					/>
					{price > 0 && <div className={s.pricePreview}>{fmt(price)}</div>}
				</div>

				{price > 0 && (
					<div className={s.field}>
						<label className={s.label}>Способы оплаты</label>
						<div className={s.payMethods}>
							{PAY_CONFIG.map(({ key, icon, label, placeholder }) => (
								<div key={key} className={s.payMethod}>
									<label className={s.payToggle}>
										<input
											type='checkbox'
											className={s.payCheckbox}
											checked={pay[key].enabled}
											onChange={e => togglePay(key, e.target.checked)}
										/>
										<span className={s.payToggleIcon}>{icon}</span>
										<span className={s.payToggleLabel}>{label}</span>
									</label>
									{pay[key].enabled && (
										<input
											className={`${s.input} ${s.payInput}`}
											type='text'
											placeholder={placeholder}
											value={pay[key].value}
											onChange={e => setPayValue(key, e.target.value)}
										/>
									)}
								</div>
							))}
							<div className={s.payMethod}>
								<label className={s.payToggle}>
									<input
										type='checkbox'
										className={s.payCheckbox}
										checked={pay.cash}
										onChange={e =>
											setPay(prev => ({ ...prev, cash: e.target.checked }))
										}
									/>
									<span className={s.payToggleIcon}>💵</span>
									<span className={s.payToggleLabel}>Наличные</span>
								</label>
							</div>
						</div>
					</div>
				)}

				<div className={s.field}>
					<label className={s.label}>Локация</label>
					<input
						className={s.input}
						type='text'
						placeholder='Da Nang, Sun World'
						value={form.location}
						onChange={e => setField('location', e.target.value)}
						required
					/>
				</div>
				<div className={s.field}>
					<label className={s.label}>Описание</label>
					<textarea
						className={s.textarea}
						placeholder='Подробности о событии...'
						rows={4}
						value={form.info}
						onChange={e => setField('info', e.target.value)}
						required
					/>
				</div>
				{isEdit && (
					<div className={s.field}>
						<label className={s.label}>Статус</label>
						<select
							className={s.input}
							value={status}
							onChange={e => setStatus(e.target.value)}
						>
							{EVENT_STATUSES.map(opt => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>
				)}
				<button className={s.submitBtn} type='submit' disabled={loading}>
					{loading ? <Loader /> : (isEdit ? 'Сохранить изменения' : 'Создать событие')}
				</button>
			</form>

			{showConfirm && impact && createPortal(
				<>
					<div className={s.confirmBackdrop} onClick={() => setShowConfirm(false)} />
					<div className={s.confirmSheet}>
						<div className={s.confirmTitle}>Изменение затронет участников</div>

						{impact.promotedNames.length > 0 && (
							<div className={s.impactSection}>
								<div className={s.impactRow}>
									<span className={s.impactIcon}>👆</span>
									<span>Переходят в основной состав ({impact.promotedNames.length}):</span>
								</div>
								<ul className={s.impactList}>
									{impact.promotedNames.map((name, i) => <li key={i}>{name}</li>)}
								</ul>
							</div>
						)}

						{impact.demotedNames.length > 0 && (
							<div className={s.impactSection}>
								<div className={s.impactRow}>
									<span className={s.impactIcon}>👇</span>
									<span>Переходят в резерв ({impact.demotedNames.length}):</span>
								</div>
								<ul className={s.impactList}>
									{impact.demotedNames.map((name, i) => <li key={i}>{name}</li>)}
								</ul>
							</div>
						)}

						{impact.deletedNames.length > 0 && (
							<div className={s.impactSection}>
								<div className={s.impactRow}>
									<span className={s.impactIcon}>🗑</span>
									<span>Будут удалены из записи ({impact.deletedNames.length}):</span>
								</div>
								<ul className={s.impactList}>
									{impact.deletedNames.map((name, i) => <li key={i}>{name}</li>)}
								</ul>
							</div>
						)}

						<div className={s.confirmActions}>
							<button className={s.confirmCancel} onClick={() => setShowConfirm(false)} type='button'>
								Отмена
							</button>
							<button className={s.confirmOk} onClick={handleConfirm} type='button' disabled={loading}>
								{loading ? <Loader /> : 'Сохранить и уведомить'}
							</button>
						</div>
					</div>
				</>,
				document.body
			)}
		</div>,
		document.body
	)
}
