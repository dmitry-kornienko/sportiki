import type { Product } from '../types'

export const PRODUCTS: Product[] = [
	{
		id: 'tshirt',
		name: 'Футболка',
		price: 400000,
		emoji: '👕',
		description:
			'Оверсайз футболка с принтом Sportiki. 100% хлопок, унисекс. Подходит для тренировок и повседневной носки.',
		colors: [
			{ name: 'Белый', hex: '#f5f3ef', img: 'images/tshirt-white.PNG' },
			{ name: 'Розовый', hex: '#e8a0b0', img: 'images/tshirt-pink.PNG' },
			{ name: 'Тёмно-синий', hex: '#3d4f6b', img: 'images/tshirt-slate.PNG' },
		],
	},
	{
		id: 'tank',
		name: 'Майка',
		price: 350000,
		emoji: '🎽',
		description:
			'Лёгкая майка без рукавов с принтом Sportiki. Унисекс. Идеально для пляжа и тренировок.',
		colors: [
			{ name: 'Белый', hex: '#f5f3ef', img: 'images/tank-white.PNG' },
			{ name: 'Чёрный', hex: '#0d0d0d', img: 'images/tank-black.PNG' },
		],
	},
]
