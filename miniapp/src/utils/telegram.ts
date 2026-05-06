const ADMIN_IDS = ['1771173222', '1397144271']

export function getTelegramUser() {
	return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}

export function getTelegramUserId(): string {
	return String(getTelegramUser()?.id ?? '')
}

export function isAdmin(): boolean {
	return ADMIN_IDS.includes(getTelegramUserId())
}

export function getInitData(): string {
	return window.Telegram?.WebApp?.initData ?? ''
}
