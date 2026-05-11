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
		// col 9: REMINDER_SENT — бот-only, API не читает
		RESERVE_LIMIT: 10,
		PRICE: 11,
		PAYMENT_INFO: 12,
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
		TICKET_ID: 9,
		PAYMENT_STATUS: 10,
		CHECKED_IN_AT: 11,
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

function _generateTicketId() {
	return Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase()
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
			reserveLimit: row[COL.EVENTS.RESERVE_LIMIT] !== ''
				? parseInt(row[COL.EVENTS.RESERVE_LIMIT]) || 0
				: DEFAULT_RESERVE_LIMIT,
			price: row[COL.EVENTS.PRICE] ? Number(row[COL.EVENTS.PRICE]) : 0,
			paymentInfo: row[COL.EVENTS.PAYMENT_INFO] ? row[COL.EVENTS.PAYMENT_INFO].toString() : '',
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

	create(eventData) {
		const sheet = SheetCache.sheet(SHEET_NAMES.EVENTS)
		const id = Date.now().toString()
		const reserveLimit = parseInt(eventData.maxPeople) > 0
			? (parseInt(eventData.reserveLimit) || DEFAULT_RESERVE_LIMIT)
			: 0
		sheet.appendRow([
			id,
			eventData.type,
			eventData.title,
			eventData.date,
			eventData.time,
			parseInt(eventData.maxPeople) || 0,
			eventData.info,
			EVENT_STATUS.OPEN,
			eventData.location || '',
			'',
			reserveLimit,
			parseInt(eventData.price) || 0,
			eventData.paymentInfo || '',
		])
		SheetCache.invalidate(SHEET_NAMES.EVENTS)
		return id
	},

	update(id, eventData) {
		const sheet = SheetCache.sheet(SHEET_NAMES.EVENTS)
		const data = SheetCache.data(SHEET_NAMES.EVENTS)
		const target = id.toString()
		for (let i = 1; i < data.length; i++) {
			if (data[i][COL.EVENTS.ID].toString() === target) {
				const rowNum = i + 1
				const row = [...data[i]]
				row[COL.EVENTS.TYPE]         = eventData.type
				row[COL.EVENTS.TITLE]        = eventData.title
				row[COL.EVENTS.DATE]         = eventData.date
				row[COL.EVENTS.TIME]         = eventData.time
				row[COL.EVENTS.MAX_PEOPLE]   = eventData.maxPeople
				row[COL.EVENTS.INFO]         = eventData.info
				row[COL.EVENTS.STATUS]       = eventData.status
				row[COL.EVENTS.LOCATION]     = eventData.location
				row[COL.EVENTS.RESERVE_LIMIT]= eventData.reserveLimit
				row[COL.EVENTS.PRICE]        = eventData.price || 0
				row[COL.EVENTS.PAYMENT_INFO] = eventData.paymentInfo || ''
				sheet.getRange(rowNum, 1, 1, row.length).setValues([row])
				SheetCache.invalidate(SHEET_NAMES.EVENTS)
				return true
			}
		}
		return false
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
		const confirmation = row[COL.REGS.CONFIRMATION] ? row[COL.REGS.CONFIRMATION].toString().trim() : ''
		const checkedInRaw = row[COL.REGS.CHECKED_IN_AT]
		const checkedInAt = checkedInRaw instanceof Date
			? Utilities.formatDate(checkedInRaw, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm')
			: (checkedInRaw ? checkedInRaw.toString().trim() : '')
		return {
			chatId: row[COL.REGS.CHAT_ID].toString(),
			eventId: row[COL.REGS.EVENT_ID].toString(),
			name: row[COL.REGS.NAME] ? row[COL.REGS.NAME].toString().trim() : '',
			status: row[COL.REGS.STATUS] ? row[COL.REGS.STATUS].toString().trim() : '',
			username: row[COL.REGS.USERNAME] ? row[COL.REGS.USERNAME].toString().trim() : '',
			isGuest: row[COL.REGS.IS_GUEST] === 'YES',
			confirmation,
			confirmed: confirmation === 'Confirmed',
			ticketId: row[COL.REGS.TICKET_ID] ? row[COL.REGS.TICKET_ID].toString().trim() : '',
			paymentStatus: row[COL.REGS.PAYMENT_STATUS] ? row[COL.REGS.PAYMENT_STATUS].toString().trim() : '',
			checkedInAt,
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
		const ticketId = _generateTicketId()
		sheet.appendRow([chatId, eventId, guestName, new Date(), status, username || '', tgName || '', 'YES', '', ticketId, '', ''])
		SheetCache.invalidate(SHEET_NAMES.REGS)
		return ticketId
	},

	// Устанавливает значение колонки CONFIRMATION для всех строк chatId+eventId.
	setConfirmation(chatId, eventId, value) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const cId = chatId.toString()
		const eId = eventId.toString()
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.CHAT_ID]?.toString().trim() === cId &&
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId
			) {
				sheet.getRange(i + 1, COL.REGS.CONFIRMATION + 1).setValue(value)
			}
		}
		SheetCache.invalidate(SHEET_NAMES.REGS)
	},

	getCheckinStats(eventId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const eId = eventId.toString()
		let registered = 0
		let checkedIn = 0
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (row[COL.REGS.EVENT_ID]?.toString().trim() !== eId) continue
			if (row[COL.REGS.STATUS]?.toString().trim() !== REG_STATUS.MAIN) continue
			registered++
			if (row[COL.REGS.CHECKED_IN_AT] && row[COL.REGS.CHECKED_IN_AT] !== '') checkedIn++
		}
		return { registered, checkedIn }
	},

	findByTicketId(ticketId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const tId = ticketId.toString().trim().toUpperCase()
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (row[COL.REGS.TICKET_ID]?.toString().trim().toUpperCase() === tId) {
				return this._rowToReg(row)
			}
		}
		return null
	},

	setCheckedIn(ticketId) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const tId = ticketId.toString().trim().toUpperCase()
		const now = new Date()
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (row[COL.REGS.TICKET_ID]?.toString().trim().toUpperCase() === tId) {
				sheet.getRange(i + 1, COL.REGS.CHECKED_IN_AT + 1).setValue(now)
				SheetCache.invalidate(SHEET_NAMES.REGS)
				return Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd.MM.yyyy HH:mm')
			}
		}
		return null
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
		const ticketId = _generateTicketId()
		sheet.appendRow([chatId, eventId, name, new Date(), status, username, tgName, 'NO', '', ticketId, '', ''])
		SheetCache.invalidate(SHEET_NAMES.REGS)
		return ticketId
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
				return { chatId: row[COL.REGS.CHAT_ID].toString(), name: row[COL.REGS.NAME]?.toString() || '' }
			}
		}
		return null
	},

	// Переводит первые N участников из резерва в основной состав.
	// Возвращает массив { chatId, name } переведённых.
	promoteFirstN(eventId, count) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const eId = eventId.toString()
		const promoted = []
		for (let i = 1; i < data.length && promoted.length < count; i++) {
			const row = data[i]
			if (
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.STATUS]?.toString().trim() === REG_STATUS.RESERVE
			) {
				sheet.getRange(i + 1, COL.REGS.STATUS + 1).setValue(REG_STATUS.MAIN)
				promoted.push({ chatId: row[COL.REGS.CHAT_ID].toString(), name: row[COL.REGS.NAME]?.toString() || '' })
			}
		}
		if (promoted.length > 0) SheetCache.invalidate(SHEET_NAMES.REGS)
		return promoted
	},

	// Переводит последних N участников основного состава в резерв.
	// «Последние» — по порядку строк (= порядку регистрации).
	// Возвращает массив { chatId, name } переведённых.
	demoteLastMain(eventId, count) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const eId = eventId.toString()
		const mainIndices = []
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.STATUS]?.toString().trim() === REG_STATUS.MAIN
			) {
				mainIndices.push(i)
			}
		}
		const todemote = mainIndices.slice(-count)
		const demoted = []
		todemote.forEach(i => {
			const row = data[i]
			sheet.getRange(i + 1, COL.REGS.STATUS + 1).setValue(REG_STATUS.RESERVE)
			demoted.push({ chatId: row[COL.REGS.CHAT_ID].toString(), name: row[COL.REGS.NAME]?.toString() || '' })
		})
		if (demoted.length > 0) SheetCache.invalidate(SHEET_NAMES.REGS)
		return demoted
	},

	// Удаляет последних N участников резерва.
	// Возвращает массив { chatId, name } удалённых.
	deleteLastReserve(eventId, count) {
		const data = SheetCache.data(SHEET_NAMES.REGS)
		const sheet = SheetCache.sheet(SHEET_NAMES.REGS)
		const eId = eventId.toString()
		const reserveIndices = []
		for (let i = 1; i < data.length; i++) {
			const row = data[i]
			if (
				row[COL.REGS.EVENT_ID]?.toString().trim() === eId &&
				row[COL.REGS.STATUS]?.toString().trim() === REG_STATUS.RESERVE
			) {
				reserveIndices.push(i)
			}
		}
		const toDelete = reserveIndices.slice(-count)
		const deleted = []
		// Удаляем в обратном порядке чтобы индексы строк оставались валидными
		toDelete.slice().reverse().forEach(i => {
			const row = data[i]
			deleted.unshift({ chatId: row[COL.REGS.CHAT_ID].toString(), name: row[COL.REGS.NAME]?.toString() || '' })
			sheet.deleteRow(i + 1)
		})
		if (deleted.length > 0) SheetCache.invalidate(SHEET_NAMES.REGS)
		return deleted
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
	createEvent(eventData) {
		return EventRepository.create(eventData)
	},
	updateEvent(id, eventData) {
		return EventRepository.update(id, eventData)
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
		return RegRepository.createGuest(chatId, eventId, guestName, status, username, tgName) // returns ticketId
	},
	deleteGuestReg(chatId, eventId) {
		return RegRepository.deleteGuestByUserAndEvent(chatId, eventId)
	},
	createReg(chatId, eventId, name, status, username, tgName) {
		return RegRepository.create(chatId, eventId, name, status, username, tgName) // returns ticketId
	},
	deleteReg(chatId, eventId) {
		return RegRepository.deleteByUserAndEvent(chatId, eventId)
	},
	setConfirmation(chatId, eventId, value) {
		return RegRepository.setConfirmation(chatId, eventId, value)
	},
	findRegByTicketId(ticketId) {
		return RegRepository.findByTicketId(ticketId)
	},
	getCheckinStats(eventId) {
		return RegRepository.getCheckinStats(eventId)
	},
	setCheckedIn(ticketId) {
		return RegRepository.setCheckedIn(ticketId)
	},
	promoteFirstReserve(eventId) {
		return RegRepository.promoteFirstReserve(eventId)
	},
	promoteFirstN(eventId, count) {
		return RegRepository.promoteFirstN(eventId, count)
	},
	demoteLastMain(eventId, count) {
		return RegRepository.demoteLastMain(eventId, count)
	},
	deleteLastReserve(eventId, count) {
		return RegRepository.deleteLastReserve(eventId, count)
	},
	findOrCreateUser(chatId, from) {
		return UserRepository.findOrCreate(chatId, from)
	},
	clearCache() {
		SheetCache.clear()
	},
}
