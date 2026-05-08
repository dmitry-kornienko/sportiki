import { formatPrice } from '../../utils/format'
import { useToastAction } from '../../context/ToastContext'
import s from './EventDetail.module.css'

const PAY_LABELS: Record<string, { icon: string; label: string }> = {
	vn:    { icon: '🏦', label: 'Вьетнамский счёт' },
	sbp:   { icon: '📱', label: 'СБП' },
	bybit: { icon: '⚡', label: 'Bybit' },
	cash:  { icon: '💵', label: 'Наличные' },
}

interface Props {
	price: number
	paymentInfo: string
	onPayClick: () => void
}

export function PaymentBlock({ price, paymentInfo, onPayClick }: Props) {
	const toast = useToastAction()

	let methods: Record<string, string | boolean> | null = null
	if (paymentInfo) {
		try {
			methods = JSON.parse(paymentInfo) as Record<string, string | boolean>
		} catch {
			methods = { _text: paymentInfo }
		}
	}

	return (
		<div className={s.paymentBlock}>
			<div className={s.paymentHeader}>
				<div className={s.paymentTitle}>💳 Платное — {formatPrice(price)}</div>
				<button className={s.payBtn} onClick={onPayClick}>Оплатить</button>
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
						const copyable = typeof val === 'string' && !!val
						return (
							<div
								key={key}
								className={`${s.payMethodItem} ${copyable ? s.payMethodItemCopyable : ''}`}
								onClick={() => {
									if (!copyable) return
									navigator.clipboard.writeText(val as string)
										.then(() => toast('Реквизиты скопированы'))
										.catch(() => toast('Не удалось скопировать'))
								}}
							>
								<span className={s.payMethodIcon}>{cfg.icon}</span>
								<span className={s.payMethodDetails}>
									<span className={s.payMethodLabel}>{cfg.label}</span>
									{copyable && <span className={s.payMethodValue}>{val as string}</span>}
								</span>
								{copyable && <span className={s.payMethodCopy}>⎘</span>}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
