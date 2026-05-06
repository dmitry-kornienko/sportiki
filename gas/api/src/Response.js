// ============================================================
// файл: Response.js
// Назначение: Хелперы для формирования JSON ответов API.
// ============================================================

const Response = {
	/**
	 * Успешный ответ.
	 * @param {*} data
	 * @returns {GoogleAppsScript.Content.TextOutput}
	 */
	ok(data = null) {
		return this._json({ ok: true, data })
	},

	/**
	 * Ответ с ошибкой.
	 * @param {string} message
	 * @param {number} code
	 * @returns {GoogleAppsScript.Content.TextOutput}
	 */
	error(message, code = 400) {
		return this._json({ ok: false, error: message, code })
	},

	/**
	 * Формирует TextOutput с JSON и CORS заголовками.
	 * @param {object} payload
	 * @returns {GoogleAppsScript.Content.TextOutput}
	 */
	_json(payload) {
		return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
			ContentService.MimeType.JSON,
		)
	},
}
