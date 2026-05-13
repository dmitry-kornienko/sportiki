interface TelegramWebAppUser {
	id: number
	first_name: string
	last_name?: string
	username?: string
}

interface TelegramWebApp {
	ready(): void
	expand(): void
	close(): void
	initData: string
	initDataUnsafe: {
		user?: TelegramWebAppUser
	}
	sendData(data: string): void
	showScanQrPopup(params: { text?: string }, callback: (data: string) => void): void
	closeScanQrPopup(): void
	openTelegramLink(url: string): void
}

interface Window {
	Telegram?: {
		WebApp: TelegramWebApp
	}
}

declare const Telegram: {
	WebApp: TelegramWebApp
}
