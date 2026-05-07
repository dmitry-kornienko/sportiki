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

			// Step 1: secret_key = HMAC(key="WebAppData", data=bot_token)
			const secretKey = Utilities.computeHmacSha256Signature(
				getBotToken(),
				'WebAppData',
			)

			// Step 2: hash = HMAC(key=secret_key, data=data_check_string)
			// Используем Byte[] для обоих аргументов — иначе GAS кодирует ключ в UTF-8
			// и байты > 127 дают неверный результат
			const dataBytes = Utilities.newBlob(dataCheckString).getBytes()
			const expectedHash = Utilities.computeHmacSignature(
				Utilities.MacAlgorithm.HMAC_SHA_256,
				dataBytes,
				secretKey,
			)

			const expectedHex = expectedHash
				.map(b => ('0' + (b & 0xff).toString(16)).slice(-2))
				.join('')

			if (expectedHex !== hash) {
				console.error('Auth hash mismatch. Got: ' + hash + ' Expected: ' + expectedHex)
				return null
			}

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
