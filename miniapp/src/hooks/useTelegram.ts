import { useEffect } from 'react'
import { isAdmin } from '../utils/telegram'

export function useTelegram() {
	useEffect(() => {
		if (window.Telegram?.WebApp) {
			Telegram.WebApp.ready()
			Telegram.WebApp.expand()
		}
	}, [])

	return { isAdmin: isAdmin() }
}
