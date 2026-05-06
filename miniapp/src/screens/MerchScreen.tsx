import { useState } from 'react'
import type { MerchTab, Product } from '../types'
import { PRODUCTS } from '../data/products'
import { useCart } from '../hooks/useCart'
import { ProductCard } from '../components/merch/ProductCard'
import { ProductDetail } from '../components/merch/ProductDetail'
import { Cart } from '../components/merch/Cart'
import s from './MerchScreen.module.css'

interface Props {
	onToast: (msg: string) => void
}

export function MerchScreen({ onToast }: Props) {
	const [tab, setTab] = useState<MerchTab>('catalog')
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
	const { cart, total, addItem, removeItem, clear, isInCart } = useCart()

	return (
		<div className={s.screen}>
			<div className={s.tabs}>
				<button
					className={`${s.tab} ${tab === 'catalog' ? s.active : ''}`}
					onClick={() => setTab('catalog')}
				>
					Каталог
				</button>
				<button
					className={`${s.tab} ${tab === 'cart' ? s.active : ''}`}
					onClick={() => setTab('cart')}
				>
					Корзина
					{cart.length > 0 && <span className={s.badge}>{cart.length}</span>}
				</button>
			</div>

			<div className={s.content}>
				{tab === 'catalog' && (
					<div className={s.grid}>
						{PRODUCTS.map(p => (
							<ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
						))}
					</div>
				)}
				{tab === 'cart' && (
					<Cart cart={cart} total={total} onRemove={removeItem} onClear={clear} />
				)}
			</div>

			{selectedProduct && (
				<ProductDetail
					product={selectedProduct}
					isInCart={isInCart}
					onAdd={(product, color) => {
						addItem(product, color)
					}}
					onClose={() => setSelectedProduct(null)}
					onToast={onToast}
				/>
			)}
		</div>
	)
}
