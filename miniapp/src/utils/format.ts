export function formatPrice(price: number): string {
	return price.toLocaleString('ru-RU') + ' ₫'
}

const DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

export function getDayOfWeek(date: string): string {
	const [d, m, y] = date.split('.').map(Number)
	const day = new Date(y, m - 1, d).getDay()
	return DAYS[day] ?? ''
}
