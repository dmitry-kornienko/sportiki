// ============================================================
// файл: Validator.js
// Назначение: Валидация пользовательского ввода.
// Единое место для всех правил — добавил правило здесь,
// оно работает везде где используется Validator.
// ============================================================

const Validator = {
	/**
	 * Проверяет имя участника при регистрации.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	participantName(text) {
		if (!text || text.trim().length === 0) {
			return {
				valid: false,
				error: '⚠️ Имя не может быть пустым. Попробуй ещё раз.',
			}
		}
		if (text.trim().length > MAX_NAME_LENGTH) {
			return {
				valid: false,
				error: `⚠️ Имя слишком длинное (максимум ${MAX_NAME_LENGTH} символов). Попробуй ещё раз.`,
			}
		}
		return { valid: true }
	},

	/**
	 * Проверяет формат даты ДД.ММ.ГГГГ и что дата не в прошлом.
	 * Использует parseDateString из Config.js — единая точка парсинга.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	date(text) {
		if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) {
			return { valid: false, error: Texts.admin.errorDate }
		}

		const [d, m, y] = text.split('.').map(Number)
		const date = parseDateString(text)

		// Проверяем что дата реальная (например не 31.02.2026)
		if (
			!date ||
			date.getDate() !== d ||
			date.getMonth() !== m - 1 ||
			date.getFullYear() !== y
		) {
			return { valid: false, error: Texts.admin.errorDateInvalid }
		}

		// Проверяем что дата не в прошлом
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		if (date < today) {
			return { valid: false, error: Texts.admin.errorDatePast }
		}

		return { valid: true }
	},

	/**
	 * Проверяет формат времени ЧЧ:ММ.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	time(text) {
		if (!/^\d{2}:\d{2}$/.test(text)) {
			return { valid: false, error: Texts.admin.errorTime }
		}

		const [h, m] = text.split(':').map(Number)
		if (h > 23 || m > 59) {
			return { valid: false, error: Texts.admin.errorTimeInvalid }
		}

		return { valid: true }
	},

	/**
	 * Проверяет лимит мест — целое число >= 0.
	 * 0 означает безлимитное событие.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	maxPeople(text) {
		const val = parseInt(text)
		if (isNaN(val) || val < 0 || text.trim() !== String(val)) {
			return { valid: false, error: Texts.admin.errorMax }
		}
		return { valid: true }
	},

	/**
	 * Проверяет локацию — ссылка или текстовый адрес минимум 5 символов.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	location(text) {
		if (!text || text.trim().length < 5) {
			return { valid: false, error: Texts.admin.errorLoc }
		}
		return { valid: true }
	},

	/**
	 * Проверяет что строка не пустая и не слишком длинная.
	 * Используется для title, info и других текстовых полей.
	 * @param {string} text
	 * @param {number} maxLength
	 * @returns {{ valid: boolean, error?: string }}
	 */
	nonEmpty(text, maxLength = 500) {
		if (!text || text.trim().length === 0) {
			return { valid: false, error: '❌ Поле не может быть пустым.' }
		}
		if (text.length > maxLength) {
			return {
				valid: false,
				error: `❌ Слишком длинный текст (максимум ${maxLength} символов).`,
			}
		}
		return { valid: true }
	},

	/**
	 * Проверяет лимит резерва — целое число >= 0.
	 * @param {string} text
	 * @returns {{ valid: boolean, error?: string }}
	 */
	reserveLimit(text) {
		const val = parseInt(text)
		if (isNaN(val) || val < 0 || text.trim() !== String(val)) {
			return { valid: false, error: Texts.admin.errorReserve }
		}
		return { valid: true }
	},

	/**
	 * Проверяет новый лимит мест при редактировании существующего события.
	 * Дополнительно проверяет что новый лимит не меньше числа уже записавшихся.
	 * @param {string} text
	 * @param {string|number} eventId
	 * @returns {{ valid: boolean, error?: string }}
	 */
	newMax(text, eventId) {
		const baseCheck = this.maxPeople(text)
		if (!baseCheck.valid) return baseCheck

		const newMax = parseInt(text)
		if (newMax === 0) return { valid: true } // безлимит всегда ок

		const participants = db.getParticipants(eventId)
		const mainCount = participants.filter(
			p => p.status === STATUSES.MAIN,
		).length

		if (newMax < mainCount) {
			return {
				valid: false,
				error: `❌ Нельзя установить лимит ${newMax} — уже записано ${mainCount} человек в основном составе.`,
			}
		}

		return { valid: true }
	},
}
