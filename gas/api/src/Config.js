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

// Лимиты
const LIMITS = Object.freeze({
	RESERVE: 20,
	PER_USER: 2,
})

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
