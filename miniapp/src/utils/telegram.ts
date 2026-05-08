const ADMIN_IDS = ['1771173222', '1397144271']

export function getTelegramUser() {
	return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null
}

export function getTelegramUserId(): string {
	if (import.meta.env.VITE_DEV_USER_ID) return import.meta.env.VITE_DEV_USER_ID as string
	return String(getTelegramUser()?.id ?? '')
}

export function isAdmin(): boolean {
	if (import.meta.env.VITE_DEV_ADMIN === 'true') return true
	return ADMIN_IDS.includes(getTelegramUserId())
}

export function getInitData(): string {
	return window.Telegram?.WebApp?.initData ?? ''
}
