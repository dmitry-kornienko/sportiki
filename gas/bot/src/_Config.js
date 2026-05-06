// ============================================================
// файл: Config.js
// Назначение: Глобальные константы, настройки, утилиты доступа
// ============================================================

// --- БЕЗОПАСНОСТЬ ---
// Токен и секрет хранятся в PropertiesService, НЕ в коде.
// Как настроить:
//   1. В редакторе GAS → "Настройки проекта" → "Свойства скрипта"
//   2. Добавить ключи: BOT_TOKEN, WEBHOOK_SECRET, OWNER_ID, ADMIN_IDS
//
// После этого выполнить: registerWebhook() → setupTrigger()

/**
 * Возвращает свойства скрипта.
 * @returns {GoogleAppsScript.Properties.Properties}
 */
function getScriptProps() {
	return PropertiesService.getScriptProperties()
}

// Читаем все Properties один раз при загрузке скрипта.
const _PROPS = PropertiesService.getScriptProperties().getProperties()

function getBotToken() {
	const token = _PROPS['BOT_TOKEN']
	if (!token) throw new Error('BOT_TOKEN не задан в Script Properties')
	return token
}

function getWebhookSecret() {
	return _PROPS['WEBHOOK_SECRET'] || ''
}

function getOwnerId() {
	return _PROPS['OWNER_ID'] || ''
}

function getMerchManagerId() {
	return _PROPS['MERCH_MANAGER_ID'] || ''
}

// --- КОНФИГУРАЦИЯ ---

const CHANNEL_URL = 'https://t.me/INaumkin_coach'

// URL Mini App — задаётся через Script Properties (ключ MINI_APP_URL).
// Dev: ngrok-ссылка или localhost. Prod: GitHub Pages URL.
const MINI_APP_URL =
	_PROPS['MINI_APP_URL'] || 'https://dmitry-kornienko.github.io/sportiki'

/** Максимальное количество мест в резерве */
const RESERVE_LIMIT = 20

/** Максимум регистраций на одного пользователя (сам + гость) */
const REG_LIMIT_PER_USER = 2

/** Максимальная длина имени при регистрации */
const MAX_NAME_LENGTH = 50

/** Имена листов Google Таблицы */
const SHEET_NAMES = Object.freeze({
	EVENTS: 'Events',
	REGS: 'Registrations',
	USERS: 'Users',
	STATES: 'States',
})

/** Статусы для событий, регистраций и состояний пользователя */
const STATUSES = Object.freeze({
	// Регистрация участника
	MAIN: 'MAIN',
	RESERVE: 'RESERVE',

	// Статус события
	OPEN: 'Registration_Open',
	CLOSED: 'Registration_Closed',
	ARCHIVED: 'Archived',

	// Подтверждение участия
	CONFIRMED: 'Confirmed',
	NOTIFIED: 'Notified',
	NOTIFIED_MANUAL: 'Notified_Manual',

	// Шаги мастера создания события (Admin Wizard)
	SET_TYPE: 'ADMIN_SET_TYPE',
	SET_TITLE: 'ADMIN_SET_TITLE',
	SET_DATE: 'ADMIN_SET_DATE',
	SET_TIME: 'ADMIN_SET_TIME',
	SET_MAX: 'ADMIN_SET_MAX',
	SET_INFO: 'ADMIN_SET_INFO',
	SET_LOC: 'ADMIN_SET_LOC',

	// Состояния пользователя
	MAIN_MENU: 'MAIN_MENU',
	WAIT_NAME: 'WAIT_NAME',
	ADMIN_EDIT_MAX: 'ADMIN_EDIT_MAX',

	// Состояния редактирования полей существующего события
	ADMIN_EDIT_TYPE: 'ADMIN_EDIT_TYPE',
	ADMIN_EDIT_TITLE: 'ADMIN_EDIT_TITLE',
	ADMIN_EDIT_DATE: 'ADMIN_EDIT_DATE',
	ADMIN_EDIT_TIME: 'ADMIN_EDIT_TIME',
	ADMIN_EDIT_INFO: 'ADMIN_EDIT_INFO',
	ADMIN_EDIT_LOC: 'ADMIN_EDIT_LOC',

	// Состояния рассылки
	ADMIN_BROADCAST_TEXT: 'ADMIN_BROADCAST_TEXT',
	ADMIN_BROADCAST_CONFIRM: 'ADMIN_BROADCAST_CONFIRM',
})

// --- СПИСОК АДМИНИСТРАТОРОВ ---

/**
 * Возвращает список ID администраторов.
 * @returns {string[]}
 */
function getAdminIds() {
	const owner = getOwnerId()
	const extra = (_PROPS['ADMIN_IDS'] || '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean)
	return [...new Set([owner, ...extra])].filter(Boolean)
}

/**
 * Проверяет, является ли пользователь администратором.
 * @param {string|number} chatId
 * @returns {boolean}
 */
function isAdmin(chatId) {
	if (!chatId) return false
	return getAdminIds().includes(chatId.toString())
}

// --- БЕЗОПАСНОСТЬ WEBHOOK ---

/**
 * Верифицирует входящий запрос от Telegram.
 * @param {GoogleAppsScript.Events.DoPost} e
 * @returns {boolean}
 */
function verifyWebhookRequest(e) {
	const secret = getWebhookSecret()
	if (!secret) return true

	const headers = (e && e.headers) || {}
	const parameter = (e && e.parameter) || {}

	const incoming =
		headers['X-Telegram-Bot-Api-Secret-Token'] ||
		headers['x-telegram-bot-api-secret-token'] ||
		parameter['X-Telegram-Bot-Api-Secret-Token'] ||
		''

	if (!incoming) return true

	return incoming === secret
}

// --- ЗАЩИТА ОТ RACE CONDITIONS ---

/**
 * Выполняет функцию под эксклюзивной блокировкой скрипта.
 * @param {Function} fn
 * @param {number} timeoutMs
 * @returns {*}
 */
function withLock(fn, timeoutMs = 10000) {
	const lock = LockService.getScriptLock()
	const acquired = lock.tryLock(timeoutMs)

	if (!acquired) {
		throw new Error('Не удалось получить блокировку — попробуйте ещё раз')
	}

	try {
		return fn()
	} finally {
		lock.releaseLock()
	}
}

// --- ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ ---

/**
 * Экранирует спецсимволы Markdown v1 для Telegram.
 * @param {string} text
 * @returns {string}
 */
function escapeMarkdown(text) {
	if (!text) return ''
	return String(text).replace(/[_*`\[]/g, '\\$&')
}

/**
 * Возвращает название дня недели на русском по строке даты ДД.ММ.ГГГГ.
 * @param {string} dateString
 * @returns {string}
 */
function getRussianDayOfWeek(dateString) {
	try {
		const date = parseDateString(dateString)
		if (!date) return ''
		const days = [
			'воскресенье',
			'понедельник',
			'вторник',
			'среда',
			'четверг',
			'пятница',
			'суббота',
		]
		return days[date.getDay()]
	} catch (e) {
		return ''
	}
}

/**
 * Парсит строку даты ДД.ММ.ГГГГ и опциональное время ЧЧ:ММ в объект Date.
 * @param {string} dateStr
 * @param {string} timeStr
 * @returns {Date|null}
 */
function parseDateString(dateStr, timeStr = '00:00') {
	try {
		const [d, m, y] = dateStr.split('.').map(Number)
		const [h, min] = timeStr.split(':').map(Number)
		const date = new Date(y, m - 1, d, h || 0, min || 0)
		return isNaN(date.getTime()) ? null : date
	} catch (e) {
		return null
	}
}

/**
 * Безопасно парсит JSON, возвращает null при ошибке.
 * @param {string} str
 * @returns {object|null}
 */
function safeParseJson(str) {
	try {
		return JSON.parse(str)
	} catch (e) {
		return null
	}
}
