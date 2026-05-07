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
					totalCount < event.maxPeople + LIMITS.RESERVE,
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
		const mainCount = mainRegs.length
		const totalCount = regs.length

		const participants = mainRegs.map(r => ({
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
			participants,
		})
	},
}
