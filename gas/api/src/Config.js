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
 * Возвращает список ID пользователей с правом сканирования (охранники/хостес).
 * Ключ: SCANNER_IDS (через запятую) в Script Properties.
 * @returns {string[]}
 */
function getScannerIds() {
	const props = PropertiesService.getScriptProperties().getProperties()
	return (props['SCANNER_IDS'] || '').split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Проверяет, есть ли у пользователя право сканировать билеты.
 * Доступ есть у администраторов и пользователей из SCANNER_IDS.
 * @param {string|number} userId
 * @returns {boolean}
 */
function canScan(userId) {
	if (!userId) return false
	const id = userId.toString()
	return getAdminIds().includes(id) || getScannerIds().includes(id)
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
 * @param {string|number} chatId
 * @param {string} text
 * @param {object|null} keyboard — inline_keyboard объект или null
 * @returns {string|null} message_id отправленного сообщения или null при ошибке
 */
function sendTelegramMessage(chatId, text, keyboard = null) {
	try {
		const token = getBotToken()
		const payload = { chat_id: chatId, text, parse_mode: 'HTML' }
		if (keyboard) payload.reply_markup = JSON.stringify(keyboard)

		const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify(payload),
			muteHttpExceptions: true,
		})
		const json = JSON.parse(res.getContentText())
		return json.ok ? json.result.message_id : null
	} catch (e) {
		console.error('sendTelegramMessage error: ' + e)
		return null
	}
}

/**
 * Отправляет фото через Telegram Bot API (blob — первая отправка).
 * Возвращает { messageId, fileId } или null при ошибке.
 * @param {string|number} chatId
 * @param {GoogleAppsScript.Base.Blob} blob
 * @param {string} caption
 * @param {object|null} keyboard
 */
function sendTelegramPhoto(chatId, blob, caption, keyboard = null) {
	try {
		const token = getBotToken()
		const form = {
			chat_id: chatId.toString(),
			caption: caption || '',
			parse_mode: 'HTML',
			photo: blob,
		}
		if (keyboard) form.reply_markup = JSON.stringify(keyboard)

		const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
			method: 'post',
			payload: form,
			muteHttpExceptions: true,
		})
		const json = JSON.parse(res.getContentText())
		if (!json.ok) { console.error('sendTelegramPhoto error: ' + JSON.stringify(json)); return null }
		const photos = json.result.photo
		return { messageId: json.result.message_id, fileId: photos[photos.length - 1].file_id }
	} catch (e) {
		console.error('sendTelegramPhoto exception: ' + e)
		return null
	}
}

/**
 * Отправляет фото по file_id (повторная отправка без загрузки).
 * @param {string|number} chatId
 * @param {string} fileId
 * @param {string} caption
 * @param {object|null} keyboard
 */
function sendTelegramPhotoById(chatId, fileId, caption, keyboard = null) {
	try {
		const token = getBotToken()
		const payload = { chat_id: chatId.toString(), photo: fileId, caption: caption || '', parse_mode: 'HTML' }
		if (keyboard) payload.reply_markup = JSON.stringify(keyboard)

		UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify(payload),
			muteHttpExceptions: true,
		})
	} catch (e) {
		console.error('sendTelegramPhotoById exception: ' + e)
	}
}

/**
 * Редактирует существующее сообщение бота.
 * @param {string|number} chatId
 * @param {string|number} messageId
 * @param {string} text
 */
function editTelegramMessage(chatId, messageId, text) {
	try {
		const token = getBotToken()
		UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
				text,
				parse_mode: 'HTML',
			}),
			muteHttpExceptions: true,
		})
	} catch (e) {
		console.error('editTelegramMessage error: ' + e)
	}
}

/**
 * Возвращает URL Mini App из Script Properties.
 * @returns {string}
 */
function getMiniAppUrl() {
	const props = PropertiesService.getScriptProperties().getProperties()
	return props['MINI_APP_URL'] || 'https://dmitry-kornienko.github.io/sportiki'
}

/**
 * Возвращает inline_keyboard с кнопкой-ссылкой на страницу события в Mini App.
 * @param {string} eventId
 * @returns {object}
 */
function makeEventKeyboard(eventId) {
	const base = getMiniAppUrl().replace(/\/$/, '')
	const url = base + '/?eventId=' + eventId
	return { inline_keyboard: [[{ text: '📅 Открыть событие', web_app: { url } }]] }
}
