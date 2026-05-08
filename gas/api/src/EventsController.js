// ============================================================
// файл: EventsController.js
// Назначение: Обработка запросов связанных с событиями.
// ============================================================

const EventsController = {
	/**
	 * GET ?action=events
	 * Возвращает список активных событий с количеством участников.
	 */
	list() {
		const events = db.getActiveEvents()

		const result = events.map(event => {
			const regs = db.getRegsByEvent(event.id)
			const mainCount = regs.filter(r => r.status === REG_STATUS.MAIN).length
			const totalCount = regs.length
			const isFull = event.maxPeople > 0 && mainCount >= event.maxPeople

			return {
				...event,
				mainCount,
				totalCount,
				isFull,
				hasReserve:
					event.maxPeople > 0 &&
					totalCount >= event.maxPeople &&
					totalCount < event.maxPeople + event.reserveLimit,
			}
		})

		return Response.ok(result)
	},

	/**
	 * GET ?action=event&id=123
	 * Возвращает детали одного события.
	 */
	get(params) {
		const id = params.id
		if (!id) return Response.error('Не указан id события')

		const event = db.getEventById(id)
		if (!event) return Response.error('Событие не найдено', 404)

		const regs = db.getRegsByEvent(id)
		const mainRegs = regs.filter(r => r.status === REG_STATUS.MAIN)
		const reserveRegs = regs.filter(r => r.status === REG_STATUS.RESERVE)
		const mainCount = mainRegs.length
		const totalCount = regs.length

		const participants = mainRegs.map(r => ({
			name: r.name,
			username: r.username,
			isGuest: r.isGuest,
			confirmed: r.confirmed,
		}))

		const reserveParticipants = reserveRegs.map(r => ({
			name: r.name,
			username: r.username,
			isGuest: r.isGuest,
			confirmed: r.confirmed,
		}))

		return Response.ok({
			...event,
			mainCount,
			totalCount,
			isFull: event.maxPeople > 0 && mainCount >= event.maxPeople,
			hasReserve:
				event.maxPeople > 0 &&
				totalCount >= event.maxPeople &&
				totalCount < event.maxPeople + event.reserveLimit,
			participants,
			reserveParticipants,
		})
	},

	/**
	 * POST action=create_event
	 * Body: { type, title, date, time, maxPeople, reserveLimit, info, location }
	 * Только для администраторов.
	 */
	create(body, user) {
		if (!isAdmin(user.id)) return Response.error('Доступ запрещён', 403)

		const {
			type,
			title,
			date,
			time,
			maxPeople,
			reserveLimit,
			info,
			location,
			price,
			paymentInfo,
		} = body

		if (!type?.trim()) return Response.error('Не указан type')
		if (!title?.trim()) return Response.error('Не указан title')
		if (!date?.trim()) return Response.error('Не указана date')
		if (!time?.trim()) return Response.error('Не указано time')
		if (!info?.trim()) return Response.error('Не указан info')
		if (!location?.trim()) return Response.error('Не указана location')

		if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
			return Response.error('Неверный формат date: ожидается ДД.ММ.ГГГГ')
		}
		if (!/^\d{2}:\d{2}$/.test(time)) {
			return Response.error('Неверный формат time: ожидается ЧЧ:ММ')
		}

		const maxPeopleNum = parseInt(maxPeople) || 0
		if (maxPeopleNum < 0)
			return Response.error('maxPeople не может быть отрицательным')

		const reserveLimitNum =
			maxPeopleNum > 0 ? parseInt(reserveLimit) || DEFAULT_RESERVE_LIMIT : 0
		if (reserveLimitNum < 0)
			return Response.error('reserveLimit не может быть отрицательным')

		const id = db.createEvent({
			type: type.trim(),
			title: title.trim(),
			date: date.trim(),
			time: time.trim(),
			maxPeople: maxPeopleNum,
			reserveLimit: reserveLimitNum,
			info: info.trim(),
			location: location.trim(),
			price: price || 0,
			paymentInfo: paymentInfo?.trim() || '',
		})

		return Response.ok({ id })
	},

	/**
	 * POST action=update_event
	 * Body: { id, type, title, date, time, maxPeople, reserveLimit, info, location, price, paymentInfo }
	 * Только для администраторов.
	 */
	update(body, user) {
		if (!isAdmin(user.id)) return Response.error('Доступ запрещён', 403)

		const { id, type, title, date, time, maxPeople, reserveLimit, info, location, price, paymentInfo } = body

		if (!id?.toString().trim())  return Response.error('Не указан id')
		if (!type?.trim())           return Response.error('Не указан type')
		if (!title?.trim())          return Response.error('Не указан title')
		if (!date?.trim())           return Response.error('Не указана date')
		if (!time?.trim())           return Response.error('Не указано time')
		if (!info?.trim())           return Response.error('Не указан info')
		if (!location?.trim())       return Response.error('Не указана location')

		if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date))
			return Response.error('Неверный формат date: ожидается ДД.ММ.ГГГГ')
		if (!/^\d{2}:\d{2}$/.test(time))
			return Response.error('Неверный формат time: ожидается ЧЧ:ММ')

		const maxPeopleNum = parseInt(maxPeople) || 0
		if (maxPeopleNum < 0) return Response.error('maxPeople не может быть отрицательным')

		const reserveLimitNum = maxPeopleNum > 0 ? (parseInt(reserveLimit) || DEFAULT_RESERVE_LIMIT) : 0

		const found = db.updateEvent(id.toString(), {
			type: type.trim(),
			title: title.trim(),
			date: date.trim(),
			time: time.trim(),
			maxPeople: maxPeopleNum,
			reserveLimit: reserveLimitNum,
			info: info.trim(),
			location: location.trim(),
			price: price || 0,
			paymentInfo: paymentInfo?.trim() || '',
		})

		if (!found) return Response.error('Событие не найдено', 404)

		this._rebalance(id.toString(), type.trim(), title.trim(), date.trim(), time.trim(), maxPeopleNum, reserveLimitNum)

		return Response.ok({ id })
	},

	/**
	 * Ребалансирует участников после изменения лимитов.
	 * Уведомляет затронутых участников через Telegram.
	 */
	_rebalance(eventId, eventType, eventTitle, eventDate, eventTime, newMaxPeople, newReserveLimit) {
		if (newMaxPeople === 0) return

		const regs = db.getRegsByEvent(eventId)
		const mainCount = regs.filter(r => r.status === REG_STATUS.MAIN).length
		const reserveCount = regs.filter(r => r.status === REG_STATUS.RESERVE).length

		const eventLine = (eventType ? eventType + ' ' : '') + eventTitle
		const msgPromoted =
			`🎉 Отличные новости!\n\n` +
			`Вы в основном составе на событие:\n${eventLine}\n\n` +
			`📅 ${eventDate}\n🕐 ${eventTime}\n\n` +
			`До встречи на старте 🙌`
		const msgDemoted =
			`ℹ️ Обновление по вашей записи:\n\n` +
			`Из-за изменения лимита участников вы были переведены в резерв на событие:\n${eventLine}\n\n` +
			`📅 ${eventDate}\n🕐 ${eventTime}\n\n` +
			`Если место освободится — вы автоматически попадёте в основной состав 👍`
		const msgDeleted =
			`😔 К сожалению, организатор уменьшил лимит участников, поэтому ваша запись была отменена.\n\n` +
			`Событие:\n${eventLine}\n\n` +
			`📅 ${eventDate}\n🕐 ${eventTime}\n\n` +
			`Вы можете записаться снова, если появятся свободные места.`

		const notifications = []

		if (newMaxPeople > mainCount) {
			const toPromote = Math.min(reserveCount, newMaxPeople - mainCount)
			if (toPromote > 0) {
				const promoted = db.promoteFirstN(eventId, toPromote)
				promoted.forEach(r => notifications.push({ chatId: r.chatId, text: msgPromoted }))
			}
			const reserveAfter = reserveCount - toPromote
			if (reserveAfter > newReserveLimit) {
				const toDelete = reserveAfter - newReserveLimit
				const deleted = db.deleteLastReserve(eventId, toDelete)
				deleted.forEach(r => notifications.push({ chatId: r.chatId, text: msgDeleted }))
			}
		} else if (newMaxPeople < mainCount) {
			const toDemote = mainCount - newMaxPeople
			const demoted = db.demoteLastMain(eventId, toDemote)
			demoted.forEach(r => notifications.push({ chatId: r.chatId, text: msgDemoted }))
			const reserveAfter = reserveCount + toDemote
			if (reserveAfter > newReserveLimit) {
				const toDelete = reserveAfter - newReserveLimit
				const deleted = db.deleteLastReserve(eventId, toDelete)
				deleted.forEach(r => notifications.push({ chatId: r.chatId, text: msgDeleted }))
			}
		} else {
			if (reserveCount > newReserveLimit) {
				const toDelete = reserveCount - newReserveLimit
				const deleted = db.deleteLastReserve(eventId, toDelete)
				deleted.forEach(r => notifications.push({ chatId: r.chatId, text: msgDeleted }))
			}
		}

		notifications.forEach(({ chatId, text }) => sendTelegramMessage(chatId, text))
	},
}
