import { useState, useEffect } from 'react'
import type { Product, ProductColor } from '../../types'
import { fmt } from '../../utils/format'
import s from './ProductDetail.module.css'

interface Props {
	product: Product | null
	isInCart: (productId: string, colorName: string) => boolean
	onAdd: (product: Product, color: ProductColor) => void
	onClose: () => void
	onToast: (msg: string) => void
}

export function ProductDetail({ product, isInCart, onAdd, onClose, onToast }: Props) {
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
	const [imgSrc, setImgSrc] = useState('')
	const [imgError, setImgError] = useState(false)

	useEffect(() => {
		if (product) {
			setSelectedIdx(null)
			setImgSrc(product.colors[0].img)
			setImgError(false)
		}
	}, [product])

	if (!product) return null

	const selectedColor = selectedIdx !== null ? product.colors[selectedIdx] : null
	const inCart = selectedColor ? isInCart(product.id, selectedColor.name) : false

	function handleSelectColor(idx: number) {
		setSelectedIdx(idx)
		setImgSrc(product!.colors[idx].img)
		setImgError(false)
	}

	function handleAdd() {
		if (!selectedColor) return
		if (inCart) {
			onToast('Уже в корзине!')
			return
		}
		onAdd(product!, selectedColor)
		onToast(`${product!.name} (${selectedColor.name}) добавлен!`)
	}

	let btnText = 'Выбери цвет'
	if (selectedColor) {
		btnText = inCart ? '✓ В корзине' : `Добавить — ${fmt(product.price)}`
	}

	return (
		<div className={`${s.overlay} ${s.active}`}>
			<div className={s.header}>
				<button className={s.backBtn} onClick={onClose}>←</button>
				<div className={s.title}>{product.name}</div>
			</div>

			{imgError ? (
				<div className={s.placeholder}>{product.emoji}</div>
			) : (
				<img
					className={s.img}
					src={imgSrc}
					alt={product.name}
					onError={() => setImgError(true)}
				/>
			)}

			<div className={s.body}>
				<div className={s.name}>{product.name}</div>
				<div className={s.price}>{fmt(product.price)}</div>
				<div className={s.desc}>{product.description}</div>

				<div className={s.sectionLabel}>Выбери цвет</div>
				<div className={s.colorOptions}>
					{product.colors.map((c, i) => (
						<div
							key={c.name}
							className={`${s.colorOption} ${selectedIdx === i ? s.selected : ''}`}
							onClick={() => handleSelectColor(i)}
						>
							<div className={s.swatch} style={{ background: c.hex }} />
							<div className={s.colorLabel}>{c.name}</div>
						</div>
					))}
				</div>

				<button
					className={`${s.addBtn} ${inCart ? s.added : ''}`}
					disabled={!selectedColor}
					onClick={handleAdd}
				>
					{btnText}
				</button>
			</div>
		</div>
	)
}
