import { useEffect, useState } from 'react'
import { isAdmin } from '../utils/telegram'
import { fetchMe } from '../api/users'

const CACHE_KEY = 'sportiki_can_scan'

function getCachedCanScan(): boolean {
	return localStorage.getItem(CACHE_KEY) === 'true'
}

export function useTelegram() {
	const [canScan, setCanScan] = useState(isAdmin() || getCachedCanScan())

	useEffect(() => {
		if (window.Telegram?.WebApp) {
			Telegram.WebApp.ready()
			Telegram.WebApp.expand()
		}
		fetchMe()
			.then(me => {
				localStorage.setItem(CACHE_KEY, String(me.canScan))
				setCanScan(isAdmin() || me.canScan)
			})
			.catch(() => {})
	}, [])

	return { isAdmin: isAdmin(), canScan }
}
