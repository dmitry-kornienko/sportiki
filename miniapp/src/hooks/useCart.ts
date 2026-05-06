import { useState } from 'react'
import type { CartItem, Product, ProductColor } from '../types'

export function useCart() {
	const [cart, setCart] = useState<CartItem[]>([])

	function addItem(product: Product, color: ProductColor) {
		const exists = cart.find(i => i.productId === product.id && i.color === color.name)
		if (exists) return false
		setCart(prev => [
			...prev,
			{
				productId: product.id,
				name: product.name,
				color: color.name,
				colorHex: color.hex,
				img: color.img,
				emoji: product.emoji,
				price: product.price,
			},
		])
		return true
	}

	function removeItem(idx: number) {
		setCart(prev => prev.filter((_, i) => i !== idx))
	}

	function clear() {
		setCart([])
	}

	function isInCart(productId: string, colorName: string) {
		return cart.some(i => i.productId === productId && i.color === colorName)
	}

	const total = cart.reduce((s, i) => s + i.price, 0)

	return { cart, addItem, removeItem, clear, isInCart, total }
}
