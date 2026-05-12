import { post } from './client'
import type { CartItem } from '../types'

export function submitOrder(items: CartItem[], total: number): Promise<{ submitted: boolean }> {
	return post({
		action: 'order',
		items: items.map(i => ({ name: i.name, color: i.color, price: i.price })),
		total,
	})
}
