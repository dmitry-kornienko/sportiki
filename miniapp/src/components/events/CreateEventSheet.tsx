import { useState, useEffect } from 'react'
import { createEvent } from '../../api/events'
import type { Event } from '../../types'
import { fmt } from '../../utils/format'
import s from './CreateEventSheet.module.css'

interface Props {
	open: boolean
	onCreated: (event: Event) => void
	onClose: () => void
	onToast: (msg: string) => void
}

const DEFAULT_RESERVE_LIMIT = 3

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

export function CreateEventSheet({ open, onCreated, onClose, onToast }: Props) {
	const [form, setForm] = useState(EMPTY_FORM)
	const [pay, setPay] = useState<PayMethods>(EMPTY_PAY)
	const [loading, setLoading] = useState(false)
	const [visible, setVisible] = useState(false)

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
		setForm(EMPTY_FORM)
		setPay(EMPTY_PAY)
		onClose()
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (loading) return

		const [y, m, d] = form.date.split('-')
		const apiDate = `${d}.${m}.${y}`
		const maxPeople = parseInt(form.maxPeople) || 0
		const reserveLimit = maxPeople > 0 ? parseInt(form.reserveLimit) || DEFAULT_RESERVE_LIMIT : 0
		const price = parseInt(form.price) || 0

		if (price > 0) {
			const invalid = PAY_CONFIG.find(({ key }) => pay[key].enabled && !pay[key].value.trim())
			if (invalid) { onToast(`Укажите данные для: ${invalid.label}`); return }
			const anySelected = PAY_CONFIG.some(({ key }) => pay[key].enabled) || pay.cash
			if (!anySelected) { onToast('Выберите хотя бы один способ оплаты'); return }
			if (pay.sbp.enabled && !isValidPhone(pay.sbp.value)) {
				onToast('СБП: введите корректный номер телефона (+7XXXXXXXXXX)')
				return
			}
		}

		const paymentInfo = price > 0 ? serializePay(pay) : ''

		setLoading(true)
		try {

			const result = await createEvent({
				type: form.type,
				title: form.title,
				date: apiDate,
				time: form.time,
				maxPeople,
				reserveLimit,
				price,
				paymentInfo,
				info: form.info,
				location: form.location,
			})

			const newEvent: Event = {
				id: result.id,
				type: form.type,
				title: form.title,
				date: apiDate,
				time: form.time,
				maxPeople,
				reserveLimit,
				price,
				paymentInfo,
				info: form.info,
				status: 'OPEN',
				location: form.location,
				mainCount: 0,
				totalCount: 0,
				isFull: false,
				hasReserve: maxPeople > 0 && reserveLimit > 0,
			}

			onCreated(newEvent)
			onToast('Событие создано')
			handleClose()
		} catch (err) {
			onToast((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	const price = parseInt(form.price) || 0

	return (
		<div className={`${s.overlay} ${visible ? s.active : ''}`}>
			<div className={s.header}>
				<button className={s.backBtn} onClick={handleClose} type='button'>
					←
				</button>
				<span className={s.headerTitle}>Новое событие</span>
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
				<button className={s.submitBtn} type='submit' disabled={loading}>
					{loading ? 'Создаём...' : 'Создать событие'}
				</button>
			</form>
		</div>
	)
}
