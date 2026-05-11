// ============================================================
// файл: UsersController.js
// Назначение: Обработка запросов связанных с пользователями.
// ============================================================

const UsersController = {
	/**
	 * POST action=register_user
	 * Регистрирует пользователя в таблице Users если его там нет.
	 * Вызывается при первом открытии Mini App.
	 *
	 * @param {object} body
	 * @param {{ id: string, username: string, first_name: string }} user
	 */
	registerUser(body, user) {
		try {
			db.findOrCreateUser(user.id, {
				username: user.username || '',
				first_name: user.first_name || '',
			})
			return Response.ok({ registered: true })
		} catch (e) {
			console.error('UsersController.registerUser error: ' + e)
			return Response.error('Ошибка регистрации пользователя')
		}
	},

	/**
	 * GET ?action=me
	 * Возвращает данные текущего пользователя и его регистрации.
	 *
	 * @param {object} params
	 * @param {{ id: string, username: string, first_name: string }} user
	 */
	me(params, user) {
		const chatId = user.id.toString()
		const regs = db.getRegsByUser(chatId)

		const activeRegs = regs
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
					},
				}
			})
			.filter(Boolean)

		return Response.ok({
			id: chatId,
			username: user.username || '',
			firstName: user.first_name || '',
			canScan: canScan(user.id),
			registrations: activeRegs,
		})
	},
}
