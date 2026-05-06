// ============================================================
// файл: Auth.js
// Назначение: Верификация Telegram initData.
// ============================================================

const Auth = {
	/**
	 * Верифицирует Telegram initData и возвращает данные пользователя.
	 * Возвращает null если данные невалидны.
	 *
	 * @param {string} initData — строка из Telegram.WebApp.initData
	 * @returns {{ id: string, username: string, first_name: string } | null}
	 */
	verify(initData) {
		if (!initData) return null

		try {
			// Парсим initData вручную (URLSearchParams недоступен в GAS)
			const pairs = initData.split('&').map(pair => {
				const idx = pair.indexOf('=')
				return [
					decodeURIComponent(pair.slice(0, idx)),
					decodeURIComponent(pair.slice(idx + 1)),
				]
			})

			const paramsMap = Object.fromEntries(pairs)
			const hash = paramsMap['hash']
			if (!hash) return null

			// Формируем строку для проверки (без hash, отсортировано)
			const dataCheckString = pairs
				.filter(([k]) => k !== 'hash')
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => `${k}=${v}`)
				.join('\n')

			// HMAC-SHA256
			const secretKey = Utilities.computeHmacSha256Signature(
				'WebAppData',
				getBotToken(),
			)

			const expectedHash = Utilities.computeHmacSha256Signature(
				dataCheckString,
				secretKey,
			)

			const expectedHex = expectedHash
				.map(b => ('0' + (b & 0xff).toString(16)).slice(-2))
				.join('')

			if (expectedHex !== hash) return null

			// Парсим данные пользователя
			const userStr = paramsMap['user']
			if (!userStr) return null

			return JSON.parse(userStr)
		} catch (e) {
			console.error('Auth.verify error: ' + e)
			return null
		}
	},

	/**
	 * Упрощённая проверка для dev окружения.
	 * Принимает любой запрос, возвращает тестового пользователя.
	 * НИКОГДА не использовать в продакшене.
	 *
	 * @param {string} chatId
	 * @returns {{ id: string, username: string, first_name: string }}
	 */
	devUser(chatId) {
		return {
			id: chatId || 'dev_user',
			username: 'dev',
			first_name: 'Dev User',
		}
	},
}
