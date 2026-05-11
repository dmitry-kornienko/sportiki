// ============================================================
// файл: RegistrationsController.js
// Назначение: Обработка запросов регистрации на события.
// ============================================================

function _sendPromotedNotification(chatId, event) {
	const eventLine = (event.type ? event.type + ' ' : '') + event.title
	sendTelegramMessage(chatId, Texts.promoted({ eventLine, date: event.date, time: event.time }))
}

const RegistrationsController = {
	/**
	 * GET ?action=registrations
	 * Возвращает список регистраций пользователя.
	 */
	list(params, user) {
		const chatId = user.id.toString()
		const regs = db.getRegsByUser(chatId)

		const result = regs
			.map(reg => {
				const event = db.getEventById(reg.eventId)
				if (!event || event.status === EVENT_STATUS.ARCHIVED) return null
				return {
					...reg,
					event: {
						id: event.id,
						type: event.type,
						title: event.title,
						date: event.date,
						time: event.time,
						status: event.status,
					},
				}
			})
			.filter(Boolean)

		return Response.ok(result)
	},

	/**
	 * POST action=register
	 * Body: { eventId }
	 * Записывает пользователя на событие (MAIN или RESERVE).
	 */
	create(body, user) {
		const eventId = body.eventId
		if (!eventId) return Response.error('Не указан eventId')

		const chatId = user.id.toString()

		const lock = LockService.getScriptLock()
		try {
			lock.waitLock(10000)
		} catch (e) {
			return Response.error('Сервер занят, попробуйте позже', 503)
		}

		try {
			db.clearCache()

			const event = db.getEventById(eventId)
			if (!event) return Response.error('Событие не найдено', 404)
			if (event.status !== EVENT_STATUS.OPEN) return Response.error('Запись на событие закрыта')

			if (db.findRegByUserAndEvent(chatId, eventId)) {
				return Response.error('Вы уже записаны на это событие')
			}

			const regs = db.getRegsByEvent(eventId)
			const mainCount = regs.filter(r => r.status === REG_STATUS.MAIN).length

			let status
			if (event.maxPeople === 0 || mainCount < event.maxPeople) {
				status = REG_STATUS.MAIN
			} else if (regs.length < event.maxPeople + event.reserveLimit) {
				status = REG_STATUS.RESERVE
			} else {
				return Response.error('Все места заняты, запись невозможна')
			}

			const name = user.first_name || user.username || chatId
			const username = user.username ? '@' + user.username : ''
			const tgName = user.first_name || ''

			const ticketId = db.createReg(chatId, eventId, name, status, username, tgName)

			return Response.ok({ status, eventId, ticketId })
		} finally {
			lock.releaseLock()
		}
	},

	/**
	 * POST action=register_guest
	 * Body: { eventId, guestName }
	 */
	registerGuest(body, user) {
		const eventId = body.eventId
		const guestName = body.guestName?.toString().trim()
		if (!eventId) return Response.error('Не указан eventId')
		if (!guestName) return Response.error('Не указано имя гостя')

		const chatId = user.id.toString()

		const lock = LockService.getScriptLock()
		try {
			lock.waitLock(10000)
		} catch (e) {
			return Response.error('Сервер занят, попробуйте позже', 503)
		}

		try {
			db.clearCache()

			const userReg = db.findRegByUserAndEvent(chatId, eventId)
			if (!userReg) {
				return Response.error('Вы не записаны на это событие')
			}

			if (db.findGuestByUserAndEvent(chatId, eventId)) {
				return Response.error('Гость уже добавлен')
			}

			const event = db.getEventById(eventId)
			if (!event) return Response.error('Событие не найдено', 404)
			if (event.status !== EVENT_STATUS.OPEN) return Response.error('Запись на событие закрыта')

			const regs = db.getRegsByEvent(eventId)
			const mainCount = regs.filter(r => r.status === REG_STATUS.MAIN).length
			let status
			if (event.maxPeople === 0 || mainCount < event.maxPeople) {
				status = REG_STATUS.MAIN
			} else if (regs.length < event.maxPeople + event.reserveLimit) {
				status = REG_STATUS.RESERVE
			} else {
				return Response.error('Все места заняты, запись гостя невозможна')
			}

			const username = user.username ? '@' + user.username : ''
			const tgName = user.first_name || ''
			const ticketId = db.createGuestReg(chatId, eventId, guestName, status, username, tgName)

			return Response.ok({ status, eventId, guestName, ticketId })
		} finally {
			lock.releaseLock()
		}
	},

	/**
	 * POST action=unregister_guest
	 * Body: { eventId }
	 */
	removeGuest(body, user) {
		const eventId = body.eventId
		if (!eventId) return Response.error('Не указан eventId')

		const chatId = user.id.toString()

		const lock = LockService.getScriptLock()
		try {
			lock.waitLock(10000)
		} catch (e) {
			return Response.error('Сервер занят, попробуйте позже', 503)
		}

		try {
			db.clearCache()

			const guestReg = db.findGuestByUserAndEvent(chatId, eventId)
			if (!guestReg) return Response.error('Гость не найден', 404)

			const wasMain = guestReg.status === REG_STATUS.MAIN
			db.deleteGuestReg(chatId, eventId)

			if (wasMain) {
				const event = db.getEventById(eventId)
				const promoted = db.promoteFirstReserve(eventId)
				if (promoted && event) {
					_sendPromotedNotification(promoted.chatId, event)
				}
			}

			return Response.ok({ removed: true })
		} finally {
			lock.releaseLock()
		}
	},

	/**
	 * POST action=confirm_attendance
	 * Body: { eventId }
	 * Подтверждает участие — ставит CONFIRMATION=Confirmed.
	 */
	confirmAttendance(body, user) {
		const eventId = body.eventId
		if (!eventId) return Response.error('Не указан eventId')

		const chatId = user.id.toString()
		db.clearCache()

		const existing = db.findRegByUserAndEvent(chatId, eventId)
		if (!existing) return Response.error('Регистрация не найдена', 404)

		db.setConfirmation(chatId, eventId, 'Confirmed')
		return Response.ok({ confirmed: true })
	},

	/**
	 * GET ?action=ticket&ticketId=X
	 * Возвращает данные билета по TicketId. Только для администраторов.
	 */
	getTicket(params, user) {
		if (!canScan(user.id)) return Response.error('Доступ запрещён', 403)

		const ticketId = params.ticketId
		if (!ticketId) return Response.error('Не указан ticketId')

		db.clearCache()

		const reg = db.findRegByTicketId(ticketId)
		if (!reg) return Response.error('Билет не найден', 404)

		const event = db.getEventById(reg.eventId)
		if (!event) return Response.error('Событие не найдено', 404)

		const stats = db.getCheckinStats(reg.eventId)

		return Response.ok({
			ticketId: reg.ticketId,
			eventTitle: event.title,
			eventType: event.type,
			eventDate: event.date,
			eventTime: event.time,
			participantName: reg.name,
			username: reg.username,
			status: reg.status,
			paymentStatus: reg.paymentStatus,
			checkedInAt: reg.checkedInAt,
			isGuest: reg.isGuest,
			stats,
		})
	},

	/**
	 * POST action=checkin
	 * Body: { ticketId }
	 * Отмечает проход по билету. Только для администраторов.
	 */
	checkin(body, user) {
		if (!canScan(user.id)) return Response.error('Доступ запрещён', 403)

		const ticketId = body.ticketId
		if (!ticketId) return Response.error('Не указан ticketId')

		db.clearCache()

		const reg = db.findRegByTicketId(ticketId)
		if (!reg) return Response.error('Билет не найден', 404)
		if (reg.checkedInAt) return Response.error('Билет уже использован')

		const checkedInAt = db.setCheckedIn(ticketId)
		const stats = db.getCheckinStats(reg.eventId)
		return Response.ok({ checkedInAt, stats })
	},

	/**
	 * POST action=unregister
	 * Body: { eventId }
	 * Отменяет регистрацию пользователя и продвигает первого из резерва.
	 */
	remove(body, user) {
		const eventId = body.eventId
		if (!eventId) return Response.error('Не указан eventId')

		const chatId = user.id.toString()

		const lock = LockService.getScriptLock()
		try {
			lock.waitLock(10000)
		} catch (e) {
			return Response.error('Сервер занят, попробуйте позже', 503)
		}

		try {
			db.clearCache()

			const existing = db.findRegByUserAndEvent(chatId, eventId)
			if (!existing) return Response.error('Регистрация не найдена', 404)

			const wasMain = existing.status === REG_STATUS.MAIN

			db.deleteReg(chatId, eventId)

			if (wasMain) {
				const event = db.getEventById(eventId)
				const promoted = db.promoteFirstReserve(eventId)
				if (promoted && event) {
					_sendPromotedNotification(promoted.chatId, event)
				}
			}

			return Response.ok({ unregistered: true })
		} finally {
			lock.releaseLock()
		}
	},
}
