import { useState } from 'react'
import type { CartItem } from '../../types'
import { formatPrice } from '../../utils/format'
import { submitOrder } from '../../api/merch'
import { EmptyState } from '../ui/EmptyState'
import s from './Cart.module.css'

interface Props {
	cart: CartItem[]
	total: number
	onRemove: (idx: number) => void
	onClear: () => void
	onBack: () => void
}

export function Cart({ cart, total, onRemove, onClear, onBack }: Props) {
	const [success, setSuccess] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function checkout() {
		if (!cart.length) return
		setLoading(true)
		setError(null)
		try {
			await submitOrder(cart, total)
			onClear()
			setSuccess(true)
		} catch (e) {
			setError((e as Error).message || 'Ошибка при отправке заявки')
		} finally {
			setLoading(false)
		}
	}

	if (success) {
		return (
			<div className={s.success}>
				<div className={s.successIcon}>🎉</div>
				<div className={s.successTitle}>Заявка оформлена!</div>
				<div className={s.successText}>
					Наш менеджер свяжется с тобой<br />для уточнения деталей.
				</div>
				<button className={s.backBtn} onClick={onBack}>← В каталог</button>
			</div>
		)
	}

	if (!cart.length) {
		return <EmptyState icon="🛒" text="Корзина пуста" />
	}

	return (
		<div>
			<div className={s.list}>
				{cart.map((item, idx) => (
					<CartItemRow key={`${item.productId}-${item.color}`} item={item} onRemove={() => onRemove(idx)} />
				))}
			</div>
			<div className={s.footer}>
				<div className={s.total}>
					<div className={s.totalLabel}>Итого</div>
					<div className={s.totalPrice}>{formatPrice(total)}</div>
				</div>
				<div className={s.note}>
					После оформления заявки наш менеджер свяжется с тобой для уточнения деталей.
				</div>
				{error && <div className={s.error}>{error}</div>}
				<button className={s.checkoutBtn} onClick={checkout} disabled={loading}>
					{loading ? 'Отправляем...' : '✓ Оформить заявку'}
				</button>
			</div>
		</div>
	)
}

function CartItemRow({ item, onRemove }: { item: CartItem; onRemove: () => void }) {
	const [imgError, setImgError] = useState(false)

	return (
		<div className={s.item}>
			{imgError ? (
				<div className={s.itemImgPh}>{item.emoji}</div>
			) : (
				<img
					className={s.itemImg}
					src={item.img}
					alt={item.name}
					onError={() => setImgError(true)}
				/>
			)}
			<div className={s.itemInfo}>
				<div className={s.itemName}>{item.name}</div>
				<div className={s.itemColor}>
					<span className={s.colorDot} style={{ background: item.colorHex }} />
					{item.color}
				</div>
				<div className={s.itemPrice}>{formatPrice(item.price)}</div>
			</div>
			<button className={s.removeBtn} onClick={onRemove}>✕</button>
		</div>
	)
}
