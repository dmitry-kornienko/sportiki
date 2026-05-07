export interface ProductColor {
	name: string
	hex: string
	img: string
}

export interface Product {
	id: string
	name: string
	price: number
	emoji: string
	description: string
	colors: ProductColor[]
}

export interface CartItem {
	productId: string
	name: string
	color: string
	colorHex: string
	img: string
	emoji: string
	price: number
}

export interface Participant {
	name: string
	username: string
	isGuest: boolean
	confirmed: boolean
}

export interface Event {
	id: string
	type: string
	title: string
	date: string
	time: string
	maxPeople: number
	reserveLimit: number
	info: string
	status: string
	location: string
	mainCount: number
	totalCount: number
	isFull: boolean
	hasReserve: boolean
	participants?: Participant[]
	reserveParticipants?: Participant[]
}

export interface Registration {
	chatId: string
	eventId: string
	name: string
	username: string
	status: 'MAIN' | 'RESERVE'
	isGuest: boolean
	event?: {
		id: string
		type: string
		title: string
		date: string
		time: string
		status: string
	}
}

export type Screen = 'events' | 'merch' | 'scanner'
export type MerchTab = 'catalog' | 'cart'
