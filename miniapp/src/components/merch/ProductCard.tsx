import { useState } from 'react'
import type { Product } from '../../types'
import { fmt } from '../../utils/format'
import s from './ProductCard.module.css'

interface Props {
	product: Product
	onClick: () => void
}

export function ProductCard({ product, onClick }: Props) {
	const [imgError, setImgError] = useState(false)

	return (
		<div className={s.card} onClick={onClick}>
			{imgError ? (
				<div className={s.placeholder}>{product.emoji}</div>
			) : (
				<img
					className={s.img}
					src={product.colors[0].img}
					alt={product.name}
					onError={() => setImgError(true)}
				/>
			)}
			<div className={s.info}>
				<div className={s.name}>{product.name}</div>
				<div className={s.colors}>
					{product.colors.map(c => (
						<div key={c.name} className={s.dot} style={{ background: c.hex }} />
					))}
				</div>
				<div className={s.price}>{fmt(product.price)}</div>
			</div>
		</div>
	)
}
