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
	paymentConfirmed: boolean
}

export const EVENT_STATUS = {
	OPEN: 'Registration_Open',
	CLOSED: 'Registration_Closed',
	ARCHIVED: 'Archived',
} as const

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS]

export interface Event {
	id: string
	type: string
	title: string
	date: string
	time: string
	maxPeople: number
	reserveLimit: number
	price: number
	paymentInfo: string
	info: string
	status: EventStatus
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
	confirmation?: string
	ticketId?: string
	paymentStatus?: string
	event?: {
		id: string
		type: string
		title: string
		date: string
		time: string
		status: EventStatus
	}
}

export interface CheckinStats {
	registered: number
	checkedIn: number
}

export interface TicketData {
	ticketId: string
	eventTitle: string
	eventType: string
	eventDate: string
	eventTime: string
	participantName: string
	username: string
	status: 'MAIN' | 'RESERVE'
	paymentStatus: string
	checkedInAt: string
	isGuest: boolean
	stats: CheckinStats
}

export type Screen = 'events' | 'merch' | 'scanner'
export type MerchTab = 'catalog' | 'cart'
