// ============================================================
// файл: RemindersController.js
// Назначение: Hourly-триггер рассылки напоминаний участникам за 24 ч до события.
//
// Настройка триггера:
//   1. Открыть редактор GAS API
//   2. Выполнить setupRemindersTrigger() один раз вручную
// ============================================================

/**
 * Основная функция рассылки — вызывается триггером каждый час.
 * Находит события в окне [сейчас, сейчас+25ч], отправляет напоминания
 * участникам основного состава которые ещё не получали уведомление.
 */
function checkAndSendReminders() {
	db.clearCache()

	const now = new Date()
	const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

	const events = db.getActiveEvents()
	if (!events.length) return

	events.forEach(event => {
		const eventDate = _parseEventDateTime(event)
		if (!eventDate || eventDate <= now || eventDate > windowEnd) return

		console.log(`Рассылка напоминаний: ${event.title} (${event.date} ${event.time})`)

		const regs = db.getRegsByEvent(event.id)

		// Группируем MAIN-регистрации по chatId
		const playerMap = _buildPlayerMap(regs)

		Object.entries(playerMap).forEach(([chatId, player]) => {
			// Уже подтвердил или уже получал уведомление — не беспокоим
			if (player.alreadyNotified) return

			const text = Texts.reminder({ event, isMe: player.isMe, guestCount: player.guestCount })
			const keyboard = _reminderKeyboard(event.id)

			sendTelegramMessage(chatId, text, keyboard)
			Utilities.sleep(300)

			db.setConfirmation(chatId, event.id, 'Notified')
		})
	})
}

// ============================================================
// Вспомогательные функции
// ============================================================

/**
 * Парсит дату и время события в Date.
 * @param {object} event
 * @returns {Date|null}
 */
function _parseEventDateTime(event) {
	try {
		if (!event.date) return null
		const [d, m, y] = event.date.split('.').map(Number)
		const timeParts = (event.time || '00:00').split(':').map(Number)
		const h = timeParts[0] || 0
		const min = timeParts[1] || 0
		const dt = new Date(y, m - 1, d, h, min)
		return isNaN(dt.getTime()) ? null : dt
	} catch (e) {
		return null
	}
}

/**
 * Группирует MAIN-регистрации по chatId.
 * @param {object[]} regs
 * @returns {object} map: chatId → { isMe, guestCount, alreadyNotified }
 */
function _buildPlayerMap(regs) {
	const map = {}

	regs
		.filter(r => r.status === REG_STATUS.MAIN)
		.forEach(reg => {
			if (!map[reg.chatId]) {
				map[reg.chatId] = { isMe: false, guestCount: 0, alreadyNotified: false }
			}
			if (reg.isGuest) {
				map[reg.chatId].guestCount++
			} else {
				map[reg.chatId].isMe = true
				// Уже уведомлён или подтвердил
				if (reg.confirmation === 'Notified' || reg.confirmation === 'Confirmed') {
					map[reg.chatId].alreadyNotified = true
				}
			}
		})

	return map
}

/**
 * Формирует inline-клавиатуру для напоминания.
 * Callback-кнопки обрабатываются существующими хендлерами бота (checkin_yes_ / checkin_no_).
 * @param {string} eventId
 * @returns {object}
 */
function _reminderKeyboard(eventId) {
	return {
		inline_keyboard: [
			[
				{ text: '✅ Буду точно', callback_data: `checkin_yes_${eventId}` },
				{ text: '❌ Не смогу',  callback_data: `checkin_no_${eventId}`  },
			],
		],
	}
}

// ============================================================
// Управление триггером
// ============================================================

/**
 * Устанавливает hourly-триггер для checkAndSendReminders.
 * Запустить один раз вручную из редактора GAS.
 */
function setupRemindersTrigger() {
	// Удаляем старые триггеры с тем же именем функции
	ScriptApp.getProjectTriggers()
		.filter(t => t.getHandlerFunction() === 'checkAndSendReminders')
		.forEach(t => ScriptApp.deleteTrigger(t))

	ScriptApp.newTrigger('checkAndSendReminders')
		.timeBased()
		.everyHours(1)
		.create()

	console.log('Триггер checkAndSendReminders установлен (каждый час).')
}
