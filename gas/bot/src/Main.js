// ============================================================
// файл: Main.js
// Назначение: Точка входа webhook + роутинг всех сообщений.
// ============================================================

function doPost(e) {
	if (!verifyWebhookRequest(e)) return

	const contents = safeParseJson(e.postData.contents)
	if (!contents) return

	try {
		if (contents.callback_query) {
			const { id, data, message } = contents.callback_query
			// Передаём messageId чтобы обработчики могли редактировать сообщение
			CallbackRouter.handle(message.chat.id, data, id, message.message_id)
		} else if (contents.message && contents.message.web_app_data) {
			// Заявка из Mini App магазина
			MerchHandlers.handleOrder(contents.message)
		} else if (contents.message) {
			MessageRouter.handle(contents.message)
		}
	} catch (err) {
		console.error('Критическая ошибка в doPost: ' + err.toString())
	}
}

const MessageRouter = {
	handle(message) {
		const { chat, text, from } = message
		const chatId = chat.id

		db.registerUser(chatId, from)

		if (text && text.toLowerCase().startsWith('/start')) {
			db.resetState(chatId)
			Sender.mainMenu(chatId)
			return
		}

		const { state, tempData } = db.getState(chatId)

		if (state.startsWith('ADMIN_')) {
			handleAdminInput(chatId, text, { state, tempData })
			return
		}

		if (state === STATUSES.WAIT_NAME) {
			this._handleNameInput(chatId, text, tempData)
			return
		}
	},

	_handleNameInput(chatId, name, tempData) {
		const nameValidation = Validator.participantName(name)
		if (!nameValidation.valid) {
			TelegramApi.sendMessage(chatId, nameValidation.error)
			return
		}

		let eventId = tempData.toString()
		let isGuest = false

		if (eventId.startsWith('guest_')) {
			eventId = eventId.split('_')[1]
			isGuest = true
		}

		let result
		try {
			result = withLock(() =>
				db.addRegistration(chatId, eventId, name.trim(), isGuest),
			)
		} catch (err) {
			db.resetState(chatId)
			TelegramApi.sendMessage(
				chatId,
				'⚠️ Не удалось выполнить запись — попробуйте ещё раз.',
			)
			Sender.mainMenu(chatId)
			return
		}

		db.resetState(chatId)

		switch (result.status) {
			case 'FULL':
				TelegramApi.sendMessage(chatId, Texts.fullHouseError)
				Sender.mainMenu(chatId)
				break
			case 'ERROR':
				TelegramApi.sendMessage(chatId, Texts.registrationError)
				Sender.mainMenu(chatId)
				break
			case STATUSES.MAIN:
				TelegramApi.sendMessage(chatId, Texts.regSuccess)
				Utilities.sleep(500)
				Sender.userRegistrations(chatId)
				break
			case STATUSES.RESERVE:
				TelegramApi.sendMessage(chatId, Texts.fullHouse)
				Utilities.sleep(500)
				Sender.userRegistrations(chatId)
				break
			default:
				Sender.mainMenu(chatId)
		}
	},
}

const CallbackRouter = {
	_routes: [
		// Навигация
		{
			prefix: 'back_to_list',
			exact: true,
			handler: (c, d, id, mid) => CallbackHandlers.backToList(c, id, mid),
		},
		{
			prefix: 'ignore',
			exact: true,
			handler: (c, d, id) => TelegramApi.answerCallback(id),
		},
		{
			prefix: 'my_regs',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.myRegs(c, id),
		},

		// Просмотр события
		{
			prefix: 'event_info_',
			exact: false,
			handler: (c, d, id, mid) => CallbackHandlers.eventInfo(c, d, id, mid),
		},
		{
			prefix: 'show_parts_',
			exact: false,
			handler: (c, d, id, mid) =>
				CallbackHandlers.showParticipants(c, d, id, mid),
		},

		// Регистрация
		{
			prefix: 'reg_start_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.regStart(c, d, id),
		},
		{
			prefix: 'reg_guest_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.regGuest(c, d, id),
		},

		// Удаление регистрации
		{
			prefix: 'confirm_del_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.confirmDelete(c, d, id),
		},
		{
			prefix: 'delete_',
			exact: false,
			handler: (c, d, id, mid) => CallbackHandlers.deleteReg(c, d, id, mid),
		},

		// Подтверждение участия
		{
			prefix: 'checkin_yes_',
			exact: false,
			handler: (c, d, id, mid) => CallbackHandlers.checkinYes(c, d, id, mid),
		},
		{
			prefix: 'checkin_no_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.checkinNo(c, d, id),
		},
		{
			prefix: 'abort_cancel_',
			exact: false,
			handler: (c, d, id, mid) => CallbackHandlers.abortCancel(c, d, id, mid),
		},

		// Админ: создание
		{
			prefix: 'admin_create_event',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.adminCreateEvent(c, id),
		},
		{
			prefix: 'admin_cancel_wizard',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.adminCancelWizard(c, id),
		},

		// Админ: архивация
		{
			prefix: 'admin_pre_arch_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminPreArchive(c, d, id),
		},
		{
			prefix: 'admin_final_arch_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminFinalArchive(c, d, id),
		},

		// Админ: участники и лимит
		{
			prefix: 'adm_parts_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminParts(c, d, id),
		},
		{
			prefix: 'adm_del_p_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminDeleteParticipant(c, d, id),
		},
		{
			prefix: 'adm_edit_max_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminEditMax(c, d, id),
		},

		// Админ: редактирование события
		{
			prefix: 'adm_edit_event_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminEditEvent(c, d, id),
		},
		{
			prefix: 'adm_edit_field_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminEditField(c, d, id),
		},

		// Админ: рассылка
		{
			prefix: 'admin_broadcast',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.adminBroadcast(c, id),
		},
		{
			prefix: 'adm_broadcast_all',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.adminBroadcastAll(c, id),
		},
		{
			prefix: 'adm_broadcast_event',
			exact: true,
			handler: (c, d, id) => CallbackHandlers.adminBroadcastEvent(c, id),
		},
		{
			prefix: 'adm_broadcast_ev_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminBroadcastEv(c, d, id),
		},
		{
			prefix: 'adm_broadcast_send_',
			exact: false,
			handler: (c, d, id) => CallbackHandlers.adminBroadcastSend(c, d, id),
		},
	],

	handle(chatId, data, cbId, messageId) {
		const route = this._routes.find(r =>
			r.exact ? data === r.prefix : data.startsWith(r.prefix),
		)

		if (!route) {
			TelegramApi.answerCallback(cbId, 'Меню устарело, обновляем...')
			db.resetState(chatId)
			Sender.mainMenu(chatId)
			return
		}

		route.handler(chatId, data, cbId, messageId)
	},
}

const CallbackHandlers = {
	// --- Навигация ---

	backToList(chatId, cbId, messageId) {
		TelegramApi.answerCallback(cbId)
		db.resetState(chatId)
		Sender.mainMenu(chatId, messageId)
	},

	myRegs(chatId, cbId) {
		TelegramApi.answerCallback(cbId)
		Sender.userRegistrations(chatId)
	},

	// --- Просмотр ---

	eventInfo(chatId, data, cbId, messageId) {
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'event_info_')
		Sender.eventDetails(chatId, eventId, messageId)
	},

	showParticipants(chatId, data, cbId, messageId) {
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'show_parts_')
		Sender.participantsList(chatId, eventId, messageId)
	},

	// --- Регистрация ---

	regStart(chatId, data, cbId) {
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'reg_start_')
		this._startRegistration(chatId, eventId, false)
	},

	regGuest(chatId, data, cbId) {
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'reg_guest_')
		this._startRegistration(chatId, eventId, true)
	},

	_startRegistration(chatId, eventId, isGuest) {
		if (db.getUserRegCountForEvent(chatId, eventId) >= REG_LIMIT_PER_USER) {
			TelegramApi.sendMessage(chatId, Texts.limitReached)
			return
		}

		const event = db.getEventById(eventId)
		const parts = db.getParticipants(eventId)
		const max = parseInt(event.maxPeople) || 0
		const mainCount = parts.filter(p => p.status === STATUSES.MAIN).length

		if (max > 0 && mainCount >= max) {
			TelegramApi.sendMessage(chatId, Texts.reserveWarning)
		}

		db.setState(
			chatId,
			STATUSES.WAIT_NAME,
			isGuest ? `guest_${eventId}` : eventId,
		)
		TelegramApi.sendMessage(
			chatId,
			isGuest ? Texts.askGuestName : Texts.askName,
		)
	},

	// --- Удаление регистрации ---

	confirmDelete(chatId, data, cbId) {
		TelegramApi.answerCallback(cbId)
		const withoutPrefix = data.replace('confirm_del_', '')
		const sepIdx = withoutPrefix.indexOf('_')
		const type = withoutPrefix.substring(0, sepIdx)
		const eventId = withoutPrefix.substring(sepIdx + 1)
		TelegramApi.sendMessage(
			chatId,
			`${Texts.confirmDelQuestion} ${Texts.confirmLabels[type] || 'запись'}?`,
			Keyboards.confirmDelete(eventId, type),
		)
	},

	deleteReg(chatId, data, cbId, messageId) {
		const withoutPrefix = data.replace('delete_', '')
		const sepIdx = withoutPrefix.indexOf('_')
		const type = withoutPrefix.substring(0, sepIdx)
		const eventId = withoutPrefix.substring(sepIdx + 1)

		try {
			withLock(() => {
				if (type === 'me' || type === 'all')
					db.removeRegistration(chatId, eventId, false)
				if (type === 'guest' || type === 'all')
					db.removeRegistration(chatId, eventId, true)
			})
			TelegramApi.answerCallback(cbId)
		} catch (err) {
			TelegramApi.answerCallback(cbId, '⚠️ Ошибка, попробуйте ещё раз')
			return
		}

		TelegramApi.sendMessage(chatId, Texts.deleteSuccess)
		Sender.eventDetails(chatId, eventId)
	},

	// --- Подтверждение участия ---

	checkinYes(chatId, data, cbId, messageId) {
		const eventId = this._extractId(data, 'checkin_yes_')
		db.setConfirmation(chatId, eventId, STATUSES.CONFIRMED)
		TelegramApi.answerCallback(cbId, Texts.toast.confirmed)
		Sender.eventDetails(chatId, eventId, messageId)
	},

	checkinNo(chatId, data, cbId) {
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'checkin_no_')
		const userStatus = db.getUserStatusForEvent(chatId, eventId)
		TelegramApi.sendMessage(
			chatId,
			Texts.confirmNoQuestion(userStatus),
			Keyboards.confirmCancelCheckin(eventId, userStatus),
		)
	},

	abortCancel(chatId, data, cbId, messageId) {
		TelegramApi.answerCallback(cbId, Texts.toast.cancelled)
		const eventId = this._extractId(data, 'abort_cancel_')
		Sender.eventDetails(chatId, eventId, messageId)
	},

	// --- Админ: создание события ---

	adminCreateEvent(chatId, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		AdminWizard.start(chatId)
	},

	adminCancelWizard(chatId, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId, 'Создание отменено')
		db.resetState(chatId)
		Sender.mainMenu(chatId)
	},

	// --- Админ: архивация ---

	adminPreArchive(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'admin_pre_arch_')
		TelegramApi.sendMessage(
			chatId,
			Texts.admin.confirmArchiveEvent,
			Keyboards.adminConfirmArchive(eventId),
		)
	},

	adminFinalArchive(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'admin_final_arch_')
		db.archiveEvent(eventId)
		TelegramApi.sendMessage(chatId, Texts.admin.eventArchived)
		Sender.mainMenu(chatId)
	},

	// --- Админ: управление участниками ---

	adminParts(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'adm_parts_')
		const event = db.getEventById(eventId)
		const parts = db.getParticipants(eventId)
		TelegramApi.sendMessage(
			chatId,
			`👥 Управление списком: *${escapeMarkdown(event.title)}*`,
			Keyboards.adminParticipantsList(eventId, parts),
		)
	},

	adminDeleteParticipant(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return

		const withoutPrefix = data.replace('adm_del_p_', '')
		const sepIdx = withoutPrefix.indexOf('_')
		const eventId = withoutPrefix.substring(0, sepIdx)
		const rowIndex = parseInt(withoutPrefix.substring(sepIdx + 1))

		if (isNaN(rowIndex)) {
			TelegramApi.answerCallback(cbId, '⚠️ Ошибка данных')
			return
		}

		db.removeParticipantByIndex(eventId, rowIndex)
		TelegramApi.answerCallback(cbId, 'Участник удалён')

		const newParts = db.getParticipants(eventId)
		TelegramApi.sendMessage(
			chatId,
			'Список обновлён 👇',
			Keyboards.adminParticipantsList(eventId, newParts),
		)
	},

	adminEditMax(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'adm_edit_max_')
		const event = db.getEventById(eventId)
		db.setState(chatId, STATUSES.ADMIN_EDIT_MAX, eventId)
		TelegramApi.sendMessage(
			chatId,
			`Введите новый *лимит мест* для *${escapeMarkdown(event.title)}*\n_(Текущий: ${event.maxPeople})_`,
		)
	},

	adminEditEvent(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'adm_edit_event_')
		const event = db.getEventById(eventId)
		TelegramApi.sendMessage(
			chatId,
			`${Texts.admin.editMenu}\n\n*${escapeMarkdown(event.title)}*`,
			Keyboards.adminEditMenu(eventId),
		)
	},

	adminEditField(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)

		const withoutPrefix = data.replace('adm_edit_field_', '')
		const sepIdx = withoutPrefix.indexOf('_')
		const eventId = withoutPrefix.substring(0, sepIdx)
		const field = withoutPrefix.substring(sepIdx + 1)

		const fieldToState = {
			type: STATUSES.ADMIN_EDIT_TYPE,
			title: STATUSES.ADMIN_EDIT_TITLE,
			date: STATUSES.ADMIN_EDIT_DATE,
			time: STATUSES.ADMIN_EDIT_TIME,
			info: STATUSES.ADMIN_EDIT_INFO,
			location: STATUSES.ADMIN_EDIT_LOC,
		}

		const state = fieldToState[field]
		if (!state) {
			TelegramApi.answerCallback(cbId, '⚠️ Неизвестное поле')
			return
		}

		AdminEditHandlers.start(chatId, eventId, state)
	},

	// --- Админ: рассылка ---

	// Показывает меню выбора аудитории
	adminBroadcast(chatId, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		AdminBroadcastHandlers.showMenu(chatId)
	},

	// Выбрал "Всем пользователям"
	adminBroadcastAll(chatId, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		AdminBroadcastHandlers.startTextInput(chatId, 'all')
	},

	// Выбрал "По событию" — показываем список событий
	adminBroadcastEvent(chatId, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		AdminBroadcastHandlers.showEventList(chatId)
	},

	// Выбрал конкретное событие
	adminBroadcastEv(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId)
		const eventId = this._extractId(data, 'adm_broadcast_ev_')
		AdminBroadcastHandlers.startTextInput(chatId, eventId)
	},

	// Нажал "Отправить" — выполняем рассылку
	adminBroadcastSend(chatId, data, cbId) {
		if (!this._checkAdmin(chatId, cbId)) return
		TelegramApi.answerCallback(cbId, '📢 Рассылка запущена...')

		const { tempData } = db.getState(chatId)
		const parsed = safeParseJson(tempData)

		if (!parsed || !parsed.text || !parsed.target) {
			TelegramApi.sendMessage(
				chatId,
				'⚠️ Ошибка: данные рассылки не найдены. Начните заново.',
			)
			db.resetState(chatId)
			return
		}

		AdminBroadcastHandlers.send(chatId, parsed.target, parsed.text)
	},

	// --- Приватные утилиты ---

	_extractId(data, prefix) {
		return data.replace(prefix, '')
	},

	_checkAdmin(chatId, cbId) {
		if (!isAdmin(chatId)) {
			TelegramApi.answerCallback(cbId, Texts.admin.accessDenied)
			return false
		}
		return true
	},
}

const Sender = {
	// messageId — если передан, редактируем существующее сообщение вместо нового
	mainMenu(chatId, messageId = null) {
		const events = db.getActiveEvents()

		// if (events.length === 0) {
		// 	const kb = isAdmin(chatId)
		// 		? { inline_keyboard: [[{ text: Texts.buttons.adminCreate, callback_data: 'admin_create_event' }]] }
		// 		: null
		// 	TelegramApi.sendMessage(chatId, Texts.noEvents, kb)
		// 	return
		// }

		// let text = Texts.welcome + '\n\n'
		// events.forEach((ev, i) => {
		// 	const dayName = getRussianDayOfWeek(ev.date)
		// 	const closed = ev.status === STATUSES.CLOSED ? ' 🚫' : ''
		// 	text += `${i + 1}. ${ev.type} *${escapeMarkdown(ev.title)}*${closed}\n`
		// 	text += `🗓 ${ev.date} (${dayName}) | ⏰ ${ev.time}\n\n`
		// })
		// const fullText = text + Texts.chooseEvent

		const keyboard = Keyboards.mainMenu(events, chatId)
		if (messageId) {
			TelegramApi.editMessage(chatId, messageId, Texts.welcome, keyboard)
		} else {
			TelegramApi.sendMessage(chatId, Texts.welcome, keyboard)
		}
	},

	// messageId — если передан, редактируем существующее сообщение
	eventDetails(chatId, eventId, messageId = null) {
		const event = db.getEventById(eventId)
		if (!event) {
			TelegramApi.sendMessage(chatId, '⚠️ Событие не найдено.')
			return
		}

		const userStatus = db.getUserStatusForEvent(chatId, eventId)
		const parts = db.getParticipants(eventId)
		const mainCount = parts.filter(p => p.status === STATUSES.MAIN).length
		const text = Texts.eventDetails(event, mainCount, parts.length, userStatus)
		const keyboard = Keyboards.eventAction(
			eventId,
			userStatus,
			parts.length,
			parseInt(event.maxPeople),
			chatId,
			mainCount,
			event.reserveLimit,
		)

		if (messageId) {
			TelegramApi.editMessage(chatId, messageId, text, keyboard)
		} else {
			TelegramApi.sendMessage(chatId, text, keyboard)
		}
	},

	// messageId — если передан, редактируем первое сообщение (шапку со списком)
	participantsList(chatId, eventId, messageId = null) {
		try {
			const event = db.getEventById(eventId)
			if (!event) return

			const parts = db.getParticipants(eventId)

			if (parts.length === 0) {
				const text = Texts.emptyList
				const kb = Keyboards.backToEvent(eventId)
				if (messageId) {
					TelegramApi.editMessage(chatId, messageId, text, kb)
				} else {
					TelegramApi.sendMessage(chatId, text, kb)
				}
				return
			}

			const main = parts.filter(p => p.status === 'MAIN')
			const res = parts.filter(p => p.status === 'RESERVE')

			let header = `${Texts.participantsHeader}\n`
			header += `📅 ${event.date} — *${escapeMarkdown(event.title)}*\n`
			header += `_⚡️ — участие подтверждено_\n\n`

			const formatLine = (p, i) => {
				const tag = p.isConfirmed ? ' ⚡️' : ''
				const safeName = escapeMarkdown(p.name)
				const hasNick =
					p.username && p.username !== 'no_link' && p.username !== 'no_username'
				const nick = hasNick ? escapeMarkdown(p.username) : ''
				const info = p.isGuest
					? nick
						? ` (гость от ${nick})`
						: ' (гость)'
					: nick
						? ` (${nick})`
						: ''
				return `${i + 1}. ${safeName}${info}${tag}\n`
			}

			const messages = []
			let current = header

			const pushLine = line => {
				if ((current + line).length > 3800) {
					messages.push(current)
					current = ''
				}
				current += line
			}

			main.forEach((p, i) => pushLine(formatLine(p, i)))

			if (res.length > 0) {
				pushLine('\n' + Texts.reserveHeader + '\n')
				res.forEach((p, i) => pushLine(formatLine(p, i)))
			}

			if (current) messages.push(current)

			messages.forEach((msg, idx) => {
				const kb =
					idx === messages.length - 1 ? Keyboards.backToEvent(eventId) : null
				// Первое сообщение редактируем, остальные — новые
				if (idx === 0 && messageId) {
					TelegramApi.editMessage(chatId, messageId, msg, kb)
				} else {
					TelegramApi.sendMessage(chatId, msg, kb)
				}
			})
		} catch (e) {
			console.error('Sender.participantsList error: ' + e)
			TelegramApi.sendMessage(
				chatId,
				'⚠️ Ошибка при формировании списка. Попробуйте /start.',
			)
		}
	},

	userRegistrations(chatId) {
		const regs = db.getUserRegistrations(chatId)

		if (regs.length === 0) {
			TelegramApi.sendMessage(chatId, Texts.noRegs)
			this.mainMenu(chatId)
			return
		}

		const grouped = regs.reduce((acc, reg) => {
			const key = `${reg.eventDate} — ${reg.eventTitle}`
			if (!acc[key]) acc[key] = []
			acc[key].push(reg)
			return acc
		}, {})

		let text = Texts.myRegsHeader + '\n\n'
		for (const [info, people] of Object.entries(grouped)) {
			text += `🔹 *${escapeMarkdown(info)}*\n`
			people.forEach(p => {
				const icon = p.status === STATUSES.MAIN ? '✅' : '⏳'
				const guestSuffix = p.isGuest === 'YES' ? ' (Гость)' : ''
				text += `${icon} ${escapeMarkdown(p.nameInReg)}${guestSuffix}\n`
			})
			text += '\n'
		}

		TelegramApi.sendMessage(
			chatId,
			text + Texts.myRegsInstruction,
			Keyboards.myRegsActions(regs),
		)
	},
}

const TelegramApi = {
	sendMessage(chatId, text, keyboard = null) {
		const token = getBotToken()
		const payload = {
			chat_id: chatId,
			text: text,
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		}
		if (keyboard) payload.reply_markup = JSON.stringify(keyboard)

		return UrlFetchApp.fetch(
			`https://api.telegram.org/bot${token}/sendMessage`,
			{
				method: 'post',
				contentType: 'application/json',
				payload: JSON.stringify(payload),
				muteHttpExceptions: true,
			},
		)
	},

	// Редактирует существующее сообщение.
	// Если текст не изменился — Telegram вернёт ошибку, игнорируем её.
	editMessage(chatId, messageId, text, keyboard = null) {
		const token = getBotToken()
		const payload = {
			chat_id: chatId,
			message_id: messageId,
			text: text,
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		}
		if (keyboard) payload.reply_markup = JSON.stringify(keyboard)

		try {
			UrlFetchApp.fetch(
				`https://api.telegram.org/bot${token}/editMessageText`,
				{
					method: 'post',
					contentType: 'application/json',
					payload: JSON.stringify(payload),
					muteHttpExceptions: true,
				},
			)
		} catch (e) {
			// Fallback — если редактирование не удалось, отправляем новое сообщение
			console.warn('editMessage failed, sending new: ' + e)
			this.sendMessage(chatId, text, keyboard)
		}
	},

	answerCallback(callbackId, text = null) {
		const token = getBotToken()
		const payload = { callback_query_id: callbackId }
		if (text) payload.text = text

		UrlFetchApp.fetch(
			`https://api.telegram.org/bot${token}/answerCallbackQuery`,
			{
				method: 'post',
				contentType: 'application/json',
				payload: JSON.stringify(payload),
			},
		)
	},
}

// ============================================================
// MerchHandlers — обработка заявок из Mini App магазина.
// ============================================================

const MerchHandlers = {
	handleOrder(message) {
		const chatId = message.chat.id
		const from = message.from
		const rawData = message.web_app_data.data
		const order = safeParseJson(rawData)

		if (!order || !order.items || !order.items.length) {
			TelegramApi.sendMessage(
				chatId,
				'⚠️ Ошибка при оформлении заявки. Попробуй ещё раз.',
			)
			return
		}

		// Подтверждение пользователю
		const itemsList = order.items
			.map(i => `• ${i.name} — ${i.color}`)
			.join('\n')
		const total = order.total.toLocaleString('ru-RU')

		TelegramApi.sendMessage(
			chatId,
			`✅ *Заявка оформлена!*\n\n` +
				`${itemsList}\n\n` +
				`💰 Итого: *${total} ₫*\n\n` +
				`Наш менеджер свяжется с тобой в ближайшее время 👋`,
		)

		// Уведомление менеджеру
		const managerId = getMerchManagerId()
		if (!managerId) {
			console.warn('MERCH_MANAGER_ID не задан в Script Properties')
			return
		}

		const username = from.username
			? `@${from.username}`
			: from.first_name || 'Без имени'
		const managerText =
			`🛍 *Новая заявка на мерч!*\n\n` +
			`👤 Покупатель: ${username}\n` +
			`🆔 Chat ID: \`${chatId}\`\n\n` +
			`${itemsList}\n\n` +
			`💰 Итого: *${total} ₫*\n\n` +
			`Напиши покупателю чтобы уточнить детали.`

		TelegramApi.sendMessage(managerId, managerText)
	},
}

function sendMsg(chatId, text, keyboard) {
	return TelegramApi.sendMessage(chatId, text, keyboard)
}
function answerCallback(id, text) {
	return TelegramApi.answerCallback(id, text)
}
function sendMainMenu(chatId) {
	return Sender.mainMenu(chatId)
}
function sendEventDetails(chatId, id) {
	return Sender.eventDetails(chatId, id)
}
function sendUserRegistrations(chatId) {
	return Sender.userRegistrations(chatId)
}
