import { useState } from 'react'
import type { CartItem } from '../../types'
import { formatPrice } from '../../utils/format'
import { EmptyState } from '../ui/EmptyState'
import s from './Cart.module.css'

interface Props {
	cart: CartItem[]
	total: number
	onRemove: (idx: number) => void
	onClear: () => void
}

export function Cart({ cart, total, onRemove, onClear }: Props) {
	const [success, setSuccess] = useState(false)

	function checkout() {
		if (!cart.length) return
		const orderData = {
			items: cart.map(i => ({ name: i.name, color: i.color, price: i.price })),
			total,
		}
		if (window.Telegram?.WebApp) {
			Telegram.WebApp.sendData(JSON.stringify(orderData))
		}
		onClear()
		setSuccess(true)
	}

	if (success) {
		return (
			<div className={s.success}>
				<div className={s.successIcon}>🎉</div>
				<div className={s.successTitle}>Заявка оформлена!</div>
				<div className={s.successText}>
					Наш менеджер свяжется с тобой<br />для уточнения деталей.
				</div>
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
				<button className={s.checkoutBtn} onClick={checkout}>
					✓ Оформить заявку
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
