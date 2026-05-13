// ============================================================
// файл: Admin.js
// Назначение: Обработка административных команд.
//
// Архитектура:
//   WIZARD_STEPS       — шаги создания ивента как данные
//   AdminWizard        — движок пошагового диалога создания
//   AdminHandlers      — редактирование лимита мест
//   AdminEditHandlers  — редактирование полей существующего события
//   handleAdminInput() — публичная точка входа из Main.js
// ============================================================

const WIZARD_STEPS = [
	{
		state: STATUSES.SET_TYPE,
		prompt: () => Texts.admin.askType,
		validate: text => Validator.nonEmpty(text, 10),
		fieldName: 'type',
	},
	{
		state: STATUSES.SET_TITLE,
		prompt: () => Texts.admin.askTitle,
		validate: text => Validator.nonEmpty(text, 200),
		fieldName: 'title',
	},
	{
		state: STATUSES.SET_DATE,
		prompt: () => Texts.admin.askDate,
		validate: text => Validator.date(text),
		fieldName: 'date',
	},
	{
		state: STATUSES.SET_TIME,
		prompt: () => Texts.admin.askTime,
		validate: text => Validator.time(text),
		fieldName: 'time',
	},
	{
		state: STATUSES.SET_MAX,
		prompt: () => Texts.admin.askMax,
		validate: text => Validator.maxPeople(text),
		fieldName: 'maxPeople',
	},
	{
		state: STATUSES.SET_RESERVE,
		prompt: () => Texts.admin.askReserve,
		validate: text => Validator.reserveLimit(text),
		fieldName: 'reserveLimit',
		skip: accumulated => parseInt(accumulated.maxPeople) === 0,
	},
	{
		state: STATUSES.SET_INFO,
		prompt: () => Texts.admin.askInfo,
		validate: text => Validator.nonEmpty(text, 1000),
		fieldName: 'info',
	},
	{
		state: STATUSES.SET_LOC,
		prompt: () => Texts.admin.askLoc,
		validate: text => Validator.location(text),
		fieldName: 'location',
	},
]

const AdminWizard = {
	_getStep(state) {
		return WIZARD_STEPS.find(s => s.state === state) || null
	},

	_getNextStep(currentState, accumulated = {}) {
		const idx = WIZARD_STEPS.findIndex(s => s.state === currentState)
		if (idx === -1) return null
		for (let i = idx + 1; i < WIZARD_STEPS.length; i++) {
			const step = WIZARD_STEPS[i]
			if (!step.skip || !step.skip(accumulated)) return step
		}
		return null
	},

	_cancelKeyboard() {
		return {
			inline_keyboard: [
				[
					{
						text: '❌ Отменить создание',
						callback_data: 'admin_cancel_wizard',
					},
				],
			],
		}
	},

	start(chatId) {
		const firstStep = WIZARD_STEPS[0]
		db.setState(chatId, firstStep.state, '{}')
		sendMsg(chatId, firstStep.prompt(), this._cancelKeyboard())
	},

	handleInput(chatId, text, userStatus) {
		const step = this._getStep(userStatus.state)
		if (!step) return

		const validation = step.validate(text)
		if (!validation.valid) {
			sendMsg(chatId, validation.error, this._cancelKeyboard())
			return
		}

		const accumulated = safeParseJson(userStatus.tempData) || {}
		accumulated[step.fieldName] = text.trim()

		const nextStep = this._getNextStep(userStatus.state, accumulated)

		if (nextStep) {
			db.setState(chatId, nextStep.state, JSON.stringify(accumulated))
			sendMsg(chatId, nextStep.prompt(), this._cancelKeyboard())
		} else {
			this._finish(chatId, accumulated)
		}
	},

	_finish(chatId, eventData) {
		try {
			if (parseInt(eventData.maxPeople) === 0) eventData.reserveLimit = 0
			db.createEvent(eventData)
			db.resetState(chatId)
			sendMsg(chatId, Texts.admin.createSuccess)
			sendMainMenu(chatId)
		} catch (e) {
			console.error('AdminWizard._finish error: ' + e)
			db.resetState(chatId)
			sendMsg(chatId, '❌ Ошибка при создании события. Попробуйте ещё раз.')
			sendMainMenu(chatId)
		}
	},
}

const AdminHandlers = {
	handleEditMax(chatId, text, eventId) {
		const validation = Validator.newMax(text, eventId)
		if (!validation.valid) {
			sendMsg(chatId, validation.error)
			return
		}

		const newMax = parseInt(text)
		db.updateEventMax(eventId, newMax)
		db.resetState(chatId)
		sendMsg(chatId, Texts.admin.maxUpdated)
		sendEventDetails(chatId, eventId)
	},
}

// ============================================================
// AdminEditHandlers — редактирование полей существующего события.
// tempData = eventId (строка)
// ============================================================
const AdminEditHandlers = {
	// Маппинг состояния → поле таблицы, промпт и валидатор
	_fields: {
		[STATUSES.ADMIN_EDIT_TYPE]: {
			field: 'type',
			prompt: () => Texts.admin.editType,
			validate: t => Validator.nonEmpty(t, 10),
		},
		[STATUSES.ADMIN_EDIT_TITLE]: {
			field: 'title',
			prompt: () => Texts.admin.editTitle,
			validate: t => Validator.nonEmpty(t, 200),
		},
		[STATUSES.ADMIN_EDIT_DATE]: {
			field: 'date',
			prompt: () => Texts.admin.editDate,
			validate: t => Validator.date(t),
		},
		[STATUSES.ADMIN_EDIT_TIME]: {
			field: 'time',
			prompt: () => Texts.admin.editTime,
			validate: t => Validator.time(t),
		},
		[STATUSES.ADMIN_EDIT_INFO]: {
			field: 'info',
			prompt: () => Texts.admin.editInfo,
			validate: t => Validator.nonEmpty(t, 1000),
		},
		[STATUSES.ADMIN_EDIT_LOC]: {
			field: 'location',
			prompt: () => Texts.admin.editLoc,
			validate: t => Validator.location(t),
		},
	},

	getField(state) {
		return this._fields[state] || null
	},

	// Запускает редактирование конкретного поля
	start(chatId, eventId, state) {
		const fieldConfig = this.getField(state)
		if (!fieldConfig) return
		db.setState(chatId, state, eventId.toString())
		sendMsg(chatId, fieldConfig.prompt(), this._cancelKeyboard(eventId))
	},

	// Обрабатывает ввод нового значения
	handleInput(chatId, text, state, eventId) {
		const fieldConfig = this.getField(state)
		if (!fieldConfig) return

		const validation = fieldConfig.validate(text)
		if (!validation.valid) {
			sendMsg(chatId, validation.error, this._cancelKeyboard(eventId))
			return
		}

		db.updateEventField(eventId, fieldConfig.field, text.trim())
		db.resetState(chatId)
		sendMsg(chatId, Texts.admin.editSuccess)
		sendEventDetails(chatId, eventId)
	},

	_cancelKeyboard(eventId) {
		return {
			inline_keyboard: [
				[{ text: '❌ Отменить', callback_data: `event_info_${eventId}` }],
			],
		}
	},
}

// ============================================================
// AdminBroadcastHandlers — рассылка сообщений пользователям.
//
// tempData формат при вводе текста: 'all' или eventId
// tempData формат при подтверждении: JSON {target, text}
// ============================================================
const AdminBroadcastHandlers = {
	// Показывает меню выбора аудитории
	showMenu(chatId) {
		sendMsg(chatId, Texts.admin.broadcastMenu, Keyboards.broadcastMenu())
	},

	// Показывает список событий для выбора
	showEventList(chatId) {
		const events = db.getActiveEvents()
		if (!events.length) {
			sendMsg(chatId, '⚠️ Нет активных событий для рассылки.')
			return
		}
		sendMsg(
			chatId,
			Texts.admin.broadcastChooseEvent,
			Keyboards.broadcastEventList(events),
		)
	},

	// Запускает ввод текста рассылки
	// target: 'all' или eventId
	startTextInput(chatId, target) {
		db.setState(chatId, STATUSES.ADMIN_BROADCAST_TEXT, target)
		sendMsg(chatId, Texts.admin.broadcastAskText)
	},

	// Обрабатывает введённый текст — показывает подтверждение
	handleTextInput(chatId, text, target) {
		// Считаем получателей
		let recipients
		let confirmText

		if (target === 'all') {
			recipients = db.getAllUsers()
			confirmText = Texts.admin.broadcastConfirmAll(recipients.length)
		} else {
			const event = db.getEventById(target)
			const sheet = db._sheet(SHEET_NAMES.REGS)
			const data = sheet.getDataRange().getValues()
			const eid = target.toString()
			const seen = new Set()
			recipients = []
			for (let i = 1; i < data.length; i++) {
				if (data[i][COL.REGS.EVENT_ID].toString() !== eid) continue
				if (data[i][COL.REGS.STATUS].toString() !== STATUSES.MAIN) continue
				const id = data[i][COL.REGS.CHAT_ID].toString()
				if (!seen.has(id)) {
					seen.add(id)
					recipients.push(id)
				}
			}
			confirmText = Texts.admin.broadcastConfirmEvent(
				escapeMarkdown(event ? event.title : target),
				recipients.length,
			)
		}

		if (!recipients.length) {
			sendMsg(chatId, '⚠️ Нет получателей для рассылки.')
			db.resetState(chatId)
			return
		}

		// Сохраняем текст и target в tempData
		const tempData = JSON.stringify({ target, text })
		db.setState(chatId, STATUSES.ADMIN_BROADCAST_CONFIRM, tempData)
		sendMsg(chatId, confirmText, Keyboards.broadcastConfirm(target))
	},

	// Выполняет рассылку
	send(chatId, target, text) {
		let recipients = []

		if (target === 'all') {
			recipients = db.getAllUsers()
		} else {
			// Получаем chatId участников события из таблицы регистраций
			const sheet = db._sheet(SHEET_NAMES.REGS)
			const data = sheet.getDataRange().getValues()
			const eid = target.toString()
			const seen = new Set()

			for (let i = 1; i < data.length; i++) {
				if (data[i][COL.REGS.EVENT_ID].toString() !== eid) continue
				if (data[i][COL.REGS.STATUS].toString() !== STATUSES.MAIN) continue
				const id = data[i][COL.REGS.CHAT_ID].toString()
				if (!seen.has(id)) {
					seen.add(id)
					recipients.push(id)
				}
			}
		}

		let sent = 0
		let failed = 0

		recipients.forEach(recipientId => {
			try {
				sendMsg(recipientId, text)
				sent++
				Utilities.sleep(50) // соблюдаем лимиты Telegram API
			} catch (e) {
				console.error(`Ошибка рассылки для ${recipientId}: ${e}`)
				failed++
			}
		})

		db.resetState(chatId)
		sendMsg(
			chatId,
			`${Texts.admin.broadcastDone}\n\n✅ Отправлено: ${sent}\n❌ Ошибок: ${failed}`,
		)
		sendMainMenu(chatId)
	},
}

// ============================================================
// Публичная точка входа — вызывается из Main.js
// ============================================================

function handleAdminInput(chatId, text, userStatus) {
	const { state, tempData } = userStatus

	// Шаги создания ивента (wizard)
	if (AdminWizard._getStep(state)) {
		AdminWizard.handleInput(chatId, text, userStatus)
		return
	}

	// Редактирование лимита мест
	if (state === STATUSES.ADMIN_EDIT_MAX) {
		AdminHandlers.handleEditMax(chatId, text, tempData)
		return
	}

	// Редактирование полей существующего события
	if (AdminEditHandlers.getField(state)) {
		AdminEditHandlers.handleInput(chatId, text, state, tempData)
		return
	}

	// Рассылка — ввод текста
	if (state === STATUSES.ADMIN_BROADCAST_TEXT) {
		AdminBroadcastHandlers.handleTextInput(chatId, text, tempData)
		return
	}

	// Неизвестное состояние — сбрасываем
	console.warn(`Неизвестное admin-состояние: ${state} для chatId: ${chatId}`)
	db.resetState(chatId)
	sendMainMenu(chatId)
}
