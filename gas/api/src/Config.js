// ============================================================
// файл: Config.js
// Назначение: Константы и доступ к данным окружения.
// ============================================================

// ID Google Таблицы — одна на всё окружение (бот + API)
const SPREADSHEET_ID = '1zijJzQ_xOOhq6PtplkgXYdy_pRJkSWMggUZrrDHJ-zA'

// Имена листов — единственное место где они определены
const SHEET_NAMES = Object.freeze({
	EVENTS: 'Events',
	REGS: 'Registrations',
	USERS: 'Users',
	STATES: 'States',
})

// Статусы событий
const EVENT_STATUS = Object.freeze({
	OPEN: 'Registration_Open',
	CLOSED: 'Registration_Closed',
	ARCHIVED: 'Archived',
})

// Статусы регистраций
const REG_STATUS = Object.freeze({
	MAIN: 'MAIN',
	RESERVE: 'RESERVE',
})

// Лимит резерва по умолчанию — используется если в строке Events не задан ReserveLimit
const DEFAULT_RESERVE_LIMIT = 3

// Лимиты
const LIMITS = Object.freeze({
	PER_USER: 2,
})

/**
 * Возвращает список ID администраторов из Script Properties.
 * Ключи: OWNER_ID и ADMIN_IDS (через запятую) — те же что у бота.
 * @returns {string[]}
 */
function getAdminIds() {
	const props = PropertiesService.getScriptProperties().getProperties()
	const owner = props['OWNER_ID'] || ''
	const extra = (props['ADMIN_IDS'] || '').split(',').map(s => s.trim()).filter(Boolean)
	return [...new Set([owner, ...extra])].filter(Boolean)
}

/**
 * Проверяет, является ли пользователь администратором.
 * @param {string|number} userId
 * @returns {boolean}
 */
function isAdmin(userId) {
	if (!userId) return false
	return getAdminIds().includes(userId.toString())
}

/**
 * Возвращает токен бота из Script Properties.
 * Используется для верификации Telegram initData.
 * @returns {string}
 */
function getBotToken() {
	const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN')
	if (!token) throw new Error('BOT_TOKEN не задан в Script Properties')
	return token
}

/**
 * Возвращает активную Google Таблицу.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
	return SpreadsheetApp.openById(SPREADSHEET_ID)
}

/**
 * Отправляет сообщение пользователю через Telegram Bot API.
 * Используется для уведомлений при ребалансировке участников.
 * @param {string|number} chatId
 * @param {string} text
 */
function sendTelegramMessage(chatId, text) {
	try {
		const token = getBotToken()
		UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
			muteHttpExceptions: true,
		})
	} catch (e) {
		console.error('sendTelegramMessage error: ' + e)
	}
}
