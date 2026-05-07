// ============================================================
// файл: Database.js
// Назначение: Слой доступа к данным Google Sheets.
// ============================================================

// --- Индексы столбцов (0-based для row[] из getValues) ---

const COL = Object.freeze({
	EVENTS: {
		ID: 0,
		TYPE: 1,
		TITLE: 2,
		DATE: 3,
		TIME: 4,
		MAX_PEOPLE: 5,
		INFO: 6,
		STATUS: 7,
		LOCATION: 8,
		REMINDER_SENT: 9,
	},
	REGS: {
		CHAT_ID: 0,
		EVENT_ID: 1,
		NAME: 2,
		REG_DATE: 3,
		STATUS: 4,
		USERNAME: 5,
		TG_NAME: 6,
		IS_GUEST: 7,
		CONFIRMATION: 8,
	},
	USERS: {
		CHAT_ID: 0,
		USERNAME: 1,
		FIRST_NAME: 2,
		CREATED_AT: 3,
		LAST_SEEN: 4,
	},
})

// --- Кэш листов на время одного запроса ---

const SheetCache = {
	_ss: null,
	_sheets: {},
	_data: {},
	_displayData: {},

	ss() {
		if (!this._ss) this._ss = getSpreadsheet()
		return this._ss
	},

	sheet(name) {
		if (!this._sheets[name]) {
			this._sheets[name] = this.ss().getSheetByName(name)
		}
		return this._sheets[name]
	},

	data(name) {
		if (!this._data[name]) {
			this._data[name] = this.sheet(name).getDataRange().getValues()
		}
		return this._data[name]
	},

	displayData(name) {
		if (!this._displayData[name]) {
			this._displayData[name] = this.sheet(name).getDataRange().getDisplayValues()
		}
		return this._displayData[name]
	},

	invalidate(name) {
		delete this._data[name]
		delete this._displayData[name]
	},

	clear() {
		this._ss = null
		this._sheets = {}
		this._data = {}
		this._displayData = {}
	},
}

// --- EventRepository ---

const EventRepository = {
	_formatDate(value) {
		if (!value) return ''
		if (value instanceof Date) {
			return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd.MM.yyyy')
		}
		return value.toString()
	},

	_formatTime(value) {
		if (!value) return ''
		if (value instanceof Date) {
			return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm')
		}
		return value.toString()
	},

	_rowToEvent(row, displayRow) {
		return {
			id: row[COL.EVENTS.ID].toString(),
			type: row[COL.EVENTS.TYPE] ? row[COL.EVENTS.TYPE].toString() : '',
			title: row[COL.EVENTS.TITLE] ? row[COL.EVENTS.TITLE].toString() : '',
			date: this._formatDate(row[COL.EVENTS.DATE]),
			time: displayRow
				? displayRow[COL.EVENTS.TIME].substring(0, 5)
				: this._formatTime(row[COL.EVENTS.TIME]),
			maxPeople:
				row[COL.EVENTS.MAX_PEOPLE] !== ''
					? Number(row[COL.EVENTS.MAX_PEOPLE])
					: 0,
			info: row[COL.EVENTS.INFO] ? row[COL.EVENTS.INFO].toString() : '',
			status: row[COL.EVENTS.STATUS]
				? row[COL.EVENTS.STATUS].toString().trim()
				: '',
			location: row[COL.EVENTS.LOCATION]
				? row[COL.EVENTS.LOCATION].toString()
				: '',
		}
	},

	getActive() {
		const data = SheetCache.data(SHEET_NAMES.EVENTS)
		const displayData = SheetCache.displayData(SHEET_NAMES.EVENTS)
		return data
			.slice(1)
			.map((row, i) => ({ row, displayRow: displayData[i + 1] }))
			.filter(({ row }) => {
				if (!row[COL.EVENTS.ID]) return false
				const status = row[COL.EVENTS.STATUS]?.toString().trim()
				return status === EVENT_STATUS.OPEN || status === EVENT_STATUS.CLOSED
			})
			.map(({ row, displayRow }) => this._rowToEvent(row, displayRow))
			.sort((a, b) => this._parseDate(a.date) - this._parseDate(b.date))
	},

	findById(id) {
		const data = SheetCache.data(SHEET_NAMES.EVENTS)
		const displayData = SheetCache.displayData(SHEET_NAMES.EVENTS)
		const target = id.toString()
		for (let i = 1; i < data.length; i++) {
			if (data[i][COL.EVENTS.ID].toString() === target) {
				return this._rowToEvent(data[i], displayData[i])
			}
		}
		return null
	},

	_parseDate(dateStr) {
		try {
			const [d, m, y] = dateStr.split('.')
			return new Date(y, m - 1, d).getTime()
		} catch (e) {
			return 0
		}
	},
}

// --- RegRepository ---

const RegRepository = {
	_rowToReg(row) {
		return {
			chatId: row[COL.REGS.CHAT_ID].toString(),
			eventId: row[COL.REGS.EVENT_ID].toString(),
			name: row[COL.REGS.NAME] ? row[COL.REGS.NAME].toString().trim() : '',
			status: row[COL.REGS.STATUS] ? row[COL.REGS.STATUS].toString().trim() : '',
			username: row[COL.REGS.USERNAME] ? row[COL.REGS.USERNAME].toString().trim() : '',
			isGuest: row[COL.REGS.IS_GUEST] === 'YES',
			confirmed: !!row[COL.REGS.CONFIRMATION] && row[COL.REGS.CONFIRMATION].toString().trim() !== '',
		}
	},

	getByEvent(eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const target = eventId.toString()
		return data
			.slice(1)
			.filter(row => row[COL.REGS.EVENT_ID]?.toString().trim() === target)
			.map(row => this._rowToReg(row))
	},

	getByUser(chatId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const target = chatId.toString()
		return data
			.slice(1)
			.filter(row => row[COL.REGS.CHAT_ID]?.toString().trim() === target)
			.map(row => this._rowToReg(row))
	},

	findGuestByUserAndEvent(chatId, eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const cId = chatId.toString()
		const eId = eventId.toString()
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.CHAT_ID]?.toString().trim() === cId &&
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.IS_GUEST] === 'YES'
			) {
				return this._rowToReg(row)
			}
		}
		return null
	},

	createGuest(chatId, eventId, guestName, status, username, tgName) {
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		sheet.appendRow([chatId, eventId, guestName, new Date(), status, username || '', tgName || '', 'YES', ''])
		SheetCache.invalidate(SHEET_NAMES.REGS)
	},

	deleteGuestByUserAndEvent(chatId, eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const cId = chatId.toString()
		const eId = eventId.toString()
		for (let i = data.length - 1; i >= 1; i--) {
			const row = data[i]
			if (
				row[COL.REGS.CHAT_ID]?.toString().trim() === cId &&
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.IS_GUEST] === 'YES'
			) {
				sheet.deleteRow(i + 1)
				SheetCache.invalidate(SHEET_NAMES.REGS)
				return true
			}
		}
		return false
	},

	findByUserAndEvent(chatId, eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const cId = chatId.toString()
		const eId = eventId.toString()
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.CHAT_ID]?.toString().trim() === cId &&
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.IS_GUEST] !== 'YES'
			) {
				return this._rowToReg(row)
			}
		}
		return null
	},

	create(chatId, eventId, name, status, username, tgName) {
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		sheet.appendRow([chatId, eventId, name, new Date(), status, username, tgName, 'NO', ''])
		SheetCache.invalidate(SHEET_NAMES.REGS)
	},

	deleteByUserAndEvent(chatId, eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const cId = chatId.toString()
		const eId = eventId.toString()
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		for (let i = data.length - 1; i >= 1; i--) {
			const row = data[i]
			if (
				row[COL.REGS.CHAT_ID]?.toString().trim() === cId &&
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.IS_GUEST] !== 'YES'
			) {
				sheet.deleteRow(i + 1)
				SheetCache.invalidate(SHEET_NAMES.REGS)
				return true
			}
		}
		return false
	},

	promoteFirstReserve(eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const eId = eventId.toString()
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.STATUS]?.toString().trim() === REG_STATUS.RESERVE
			) {
				sheet.getRange(i + 1, COL.REGS.STATUS + 1).setValue(REG_STATUS.MAIN)
				SheetCache.invalidate(SHEET_NAMES.REGS)
				return true
			}
		}
		return false
	},
}

// --- UserRepository ---

const UserRepository = {
	findOrCreate(chatId, from) {
		const data = SheetCache.data(SHEET_NAMES.USERS)
		const id = chatId.toString()

		for (let i = 1; i < data.length; i++) {
			if (data[i][COL.USERS.CHAT_ID].toString() === id) return
		}

		const sheet = SheetCache.sheet(SHEET_NAMES.USERS)
		const username = from.username ? '@' + from.username : 'no_username'
		sheet.appendRow([
			chatId,
			username,
			from.first_name || '',
			new Date(),
			new Date(),
		])
		SheetCache.invalidate(SHEET_NAMES.USERS)
	},
}

// --- Публичный фасад ---

const db = {
	getActiveEvents() {
		return EventRepository.getActive()
	},
	getEventById(id) {
		return EventRepository.findById(id)
	},
	getRegsByEvent(eventId) {
		return RegRepository.getByEvent(eventId)
	},
	getRegsByUser(chatId) {
		return RegRepository.getByUser(chatId)
	},
	findRegByUserAndEvent(chatId, eventId) {
		return RegRepository.findByUserAndEvent(chatId, eventId)
	},
	findGuestByUserAndEvent(chatId, eventId) {
		return RegRepository.findGuestByUserAndEvent(chatId, eventId)
	},
	createGuestReg(chatId, eventId, guestName, status, username, tgName) {
		return RegRepository.createGuest(chatId, eventId, guestName, status, username, tgName)
	},
	deleteGuestReg(chatId, eventId) {
		return RegRepository.deleteGuestByUserAndEvent(chatId, eventId)
	},
	createReg(chatId, eventId, name, status, username, tgName) {
		return RegRepository.create(chatId, eventId, name, status, username, tgName)
	},
	deleteReg(chatId, eventId) {
		return RegRepository.deleteByUserAndEvent(chatId, eventId)
	},
	promoteFirstReserve(eventId) {
		return RegRepository.promoteFirstReserve(eventId)
	},
	findOrCreateUser(chatId, from) {
		return UserRepository.findOrCreate(chatId, from)
	},
	clearCache() {
		SheetCache.clear()
	},
}
