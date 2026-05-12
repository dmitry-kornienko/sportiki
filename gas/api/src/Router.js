// ============================================================
// файл: Router.js
// Назначение: Точка входа GAS API. Роутинг GET/POST запросов.
// ============================================================

/**
 * Обрабатывает GET запросы от Mini App.
 * URL: .../exec?action=events
 */
function doGet(e) {
	try {
		db.clearCache()

		const params = e.parameter || {}
		const action = params.action

		// Верификация пользователя
		const initData = params.initData || ''
		const user = Auth.verify(initData)
		const currentUser = user || Auth.devUser(params.userId)

		if (!currentUser) {
			return Response.error('Unauthorized', 401)
		}

		// Роутинг
		switch (action) {
			case 'events':
				return EventsController.list()

			case 'event':
				return EventsController.get(params)

			case 'registrations':
				return RegistrationsController.list(params, currentUser)

			case 'ticket':
				return RegistrationsController.getTicket(params, currentUser)

			case 'me':
				return UsersController.me(params, currentUser)

			default:
				return Response.error(`Неизвестный action: ${action}`, 404)
		}
	} catch (err) {
		console.error('doGet error: ' + err.toString())
		return Response.error('Внутренняя ошибка сервера', 500)
	}
}

/**
 * Обрабатывает POST запросы от Mini App.
 * Body: { action: 'register', ... }
 */
function doPost(e) {
	try {
		db.clearCache()

		const body = JSON.parse(e.postData.contents || '{}')
		const action = body.action

		// Верификация пользователя
		const initData = body.initData || ''
		const user = Auth.verify(initData)
		const currentUser = user || Auth.devUser(body.userId)

		if (!currentUser) {
			return Response.error('Unauthorized', 401)
		}

		switch (action) {
			case 'register_user':
				return UsersController.registerUser(body, currentUser)
			case 'register':
				return RegistrationsController.create(body, currentUser)
			case 'unregister':
				return RegistrationsController.remove(body, currentUser)
			case 'register_guest':
				return RegistrationsController.registerGuest(body, currentUser)
			case 'unregister_guest':
				return RegistrationsController.removeGuest(body, currentUser)
			case 'create_event':
				return EventsController.create(body, currentUser)
			case 'update_event':
				return EventsController.update(body, currentUser)
			case 'confirm_attendance':
				return RegistrationsController.confirmAttendance(body, currentUser)
			case 'submit_payment':
				return RegistrationsController.submitPayment(body, currentUser)
			case 'confirm_payment':
				return RegistrationsController.confirmPayment(body, currentUser)

			case 'checkin':
				return RegistrationsController.checkin(body, currentUser)

			case 'order':
				return MerchController.createOrder(body, currentUser)

			default:
				return Response.error(`Неизвестный action: ${action}`, 404)
		}
	} catch (err) {
		console.error('doPost error: ' + err.toString())
		return Response.error('Внутренняя ошибка сервера', 500)
	}
}
