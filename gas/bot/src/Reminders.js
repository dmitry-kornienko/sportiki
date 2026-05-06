// ============================================================
// файл: Reminders.js
// Назначение: Рассылка напоминаний участникам за ~24 часа до события.
//
// Как работает:
//   1. Триггер GAS вызывает checkAndSendReminders() по расписанию
//   2. Функция находит события в окне ближайших 25 часов
//   3. Группирует участников по chatId (учитывает гостей)
//   4. Отправляет персональное напоминание каждому
//   5. Пакетно записывает статусы уведомлений обратно в таблицу
//
// Настройка триггера:
//   Setup.js → setupTrigger() — запустить один раз вручную
// ============================================================

/**
 * Основная функция рассылки напоминаний.
 * Вызывается триггером GAS или вручную через runManualReminder().
 *
 * @param {boolean} isManual — true = повторная рассылка даже уже уведомлённым
 * @param {string|null} targetEventId — ID конкретного события или null для всех
 */
function checkAndSendReminders(isManual = false, targetEventId = null) {
	const now = new Date()
	const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

	const events = db.getActiveEvents()
	if (!events.length) return

	// Читаем все регистрации один раз — не дёргаем Sheets в цикле
	const regsSheet = db._sheet(SHEET_NAMES.REGS)
	const regsData = regsSheet.getDataRange().getValues()

	// Кэшируем колонку подтверждений для пакетной записи в конце
	const confirmationColumn = regsData.map(row => [row[COL.REGS.CONFIRMATION]])
	let hasChanges = false

	events.forEach(event => {
		// Если передан конкретный ID — обрабатываем только его
		if (targetEventId && event.id.toString() !== targetEventId.toString())
			return

		const fullEvent = db.getEventById(event.id)
		if (!fullEvent || fullEvent.status === STATUSES.ARCHIVED) return

		// Парсим дату и время события
		const eventDate = _parseEventDate(fullEvent)
		if (!eventDate) {
			console.warn(
				`Не удалось распарсить дату события ${event.id}: ${fullEvent.date} ${fullEvent.time}`,
			)
			return
		}

		// Проверяем попадание в окно уведомлений
		if (eventDate <= now || eventDate > windowEnd) return

		console.log(
			`Обработка напоминаний для события: ${fullEvent.title} (${fullEvent.date})`,
		)

		// Группируем строки регистраций по chatId
		const playerMap = _buildPlayerMap(regsData, event.id)

		// Рассылаем напоминания
		Object.entries(playerMap).forEach(([chatId, playerData]) => {
			const sent = _sendReminderToPlayer(
				chatId,
				playerData,
				fullEvent,
				event.id,
				isManual,
			)

			if (sent) {
				// Обновляем статус в кэше колонки
				const nextStatus = playerData.hasBeenNotified
					? STATUSES.NOTIFIED_MANUAL
					: STATUSES.NOTIFIED

				playerData.rowIndices.forEach(rowIdx => {
					const current = confirmationColumn[rowIdx][0]
					if (current !== STATUSES.CONFIRMED && current !== nextStatus) {
						confirmationColumn[rowIdx][0] = nextStatus
						hasChanges = true
					}
				})
			}
		})
	})

	// Пакетная запись — один вызов вместо N отдельных setValue()
	if (hasChanges) {
		regsSheet
			.getRange(1, COLUMNS.REGS.CONFIRMATION, confirmationColumn.length, 1)
			.setValues(confirmationColumn)
		console.log('Статусы уведомлений обновлены.')
	}
}

// ============================================================
// Приватные вспомогательные функции
// ============================================================

/**
 * Парсит дату и время события в объект Date.
 * Делегирует в parseDateString из Config.js — единая точка парсинга.
 * @param {object} event
 * @returns {Date|null}
 */
function _parseEventDate(event) {
	return parseDateString(event.date, event.time)
}

/**
 * Группирует строки регистраций по chatId для конкретного события.
 * Возвращает карту: chatId → данные участника.
 *
 * @param {any[][]} regsData — все строки листа Registrations
 * @param {string|number} eventId
 * @returns {object} playerMap
 */
function _buildPlayerMap(regsData, eventId) {
	const eid = eventId.toString()
	const playerMap = {}

	regsData.forEach((row, i) => {
		if (i === 0) return // пропускаем заголовок

		const rowEventId = row[COL.REGS.EVENT_ID]
			? row[COL.REGS.EVENT_ID].toString()
			: ''
		const rowStatus = row[COL.REGS.STATUS]
			? row[COL.REGS.STATUS].toString()
			: ''

		// Берём только MAIN участников этого события
		if (rowEventId !== eid || rowStatus !== STATUSES.MAIN) return

		const chatId = row[COL.REGS.CHAT_ID].toString()
		const isGuest = row[COL.REGS.IS_GUEST] === 'YES'
		const confStatus = row[COL.REGS.CONFIRMATION]
			? row[COL.REGS.CONFIRMATION].toString()
			: ''

		if (!playerMap[chatId]) {
			playerMap[chatId] = {
				isMe: false,
				guestCount: 0,
				rowIndices: [],
				allStatuses: [],
				hasBeenNotified: false,
			}
		}

		playerMap[chatId].rowIndices.push(i)
		playerMap[chatId].allStatuses.push(confStatus)

		if (isGuest) playerMap[chatId].guestCount++
		else playerMap[chatId].isMe = true
	})

	// Вычисляем hasBeenNotified после сбора всех строк
	Object.values(playerMap).forEach(p => {
		p.hasBeenNotified = p.allStatuses.some(
			s => s === STATUSES.NOTIFIED || s === STATUSES.NOTIFIED_MANUAL,
		)
	})

	return playerMap
}

/**
 * Отправляет напоминание одному участнику.
 * Возвращает true если сообщение было отправлено.
 *
 * @param {string} chatId
 * @param {object} playerData
 * @param {object} event
 * @param {string|number} eventId
 * @param {boolean} isManual
 * @returns {boolean}
 */
function _sendReminderToPlayer(chatId, playerData, event, eventId, isManual) {
	// Уже подтвердил участие — не беспокоим
	if (playerData.allStatuses.includes(STATUSES.CONFIRMED)) return false

	// Автоматическая рассылка: пропускаем уже уведомлённых
	// Ручная рассылка: отправляем всем кто не подтвердил
	if (!isManual && playerData.hasBeenNotified) return false

	try {
		let text = Texts.reminderText(event, {
			isMe: playerData.isMe,
			guestCount: playerData.guestCount,
		})

		// Для ручной повторной рассылки добавляем пометку
		if (isManual && playerData.hasBeenNotified) {
			text = '⚠️ *ПОВТОРНОЕ НАПОМИНАНИЕ*\n\n' + text
		}

		sendMsg(chatId, text, Keyboards.confirmParticipation(eventId))
		Utilities.sleep(300) // соблюдаем лимиты Telegram API

		return true
	} catch (e) {
		console.error(`Ошибка рассылки для chatId ${chatId}: ${e}`)
		return false
	}
}

// ============================================================
// Публичные функции для ручного запуска из редактора GAS
// ============================================================

/**
 * Ручной запуск рассылки для конкретного события.
 * Укажи targetId или оставь null для всех ближайших событий.
 * Запускать из редактора GAS вручную.
 */
function runManualReminder() {
	const targetId = null // укажи ID события или оставь null

	console.log(`Ручная рассылка. Событие: ${targetId || 'все ближайшие'}`)
	checkAndSendReminders(true, targetId)
	console.log('Ручная рассылка завершена.')
}

/**
 * Диагностика: показывает какие события попадают в окно уведомлений.
 * Полезно для проверки перед запуском триггера.
 */
function checkUpcomingEvents() {
	const now = new Date()
	const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)
	const events = db.getActiveEvents()

	console.log(`Сейчас: ${now.toLocaleString()}`)
	console.log(`Окно уведомлений до: ${windowEnd.toLocaleString()}`)
	console.log('---')

	events.forEach(event => {
		const fullEvent = db.getEventById(event.id)
		if (!fullEvent) return

		const eventDate = _parseEventDate(fullEvent)
		if (!eventDate) {
			console.log(
				`[${event.id}] ${fullEvent.title} — ⚠️ не удалось распарсить дату`,
			)
			return
		}

		const inWindow = eventDate > now && eventDate <= windowEnd
		console.log(
			`[${event.id}] ${fullEvent.title} | ${fullEvent.date} ${fullEvent.time}` +
				` | ${inWindow ? '✅ В окне уведомлений' : '⏭ Вне окна'}`,
		)
	})
}
