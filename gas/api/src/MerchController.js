// ============================================================
// файл: MerchController.js
// Назначение: Обработка заказов мерча из Mini App.
// ============================================================

const MerchController = {

	/**
	 * POST action=order
	 * Body: { items: [{ name, color, price }], total }
	 * Принимает заказ и отправляет уведомление менеджеру.
	 */
	createOrder(body, user) {
		const { items, total } = body
		if (!items || !items.length) return Response.error('Список товаров пуст')

		const managerId = getMerchManagerId()
		if (!managerId) {
			console.warn('MERCH_MANAGER_ID не задан в Script Properties')
			return Response.error('Менеджер мерча не настроен', 500)
		}

		const itemsList  = items.map(i => `• ${i.name} — ${i.color}`).join('\n')
		const totalStr   = Number(total).toLocaleString('ru-RU') + ' ₫'
		const userName   = user.first_name || user.username || user.id.toString()
		const username   = user.username ? '@' + user.username : null
		const userDisplay = username ? `${userName} (${username})` : userName

		const text = Texts.newMerchOrder({ userDisplay, chatId: user.id, itemsList, total: totalStr })

		const keyboard = username
			? { inline_keyboard: [[{ text: '💬 Написать покупателю', url: `https://t.me/${user.username}` }]] }
			: null

		sendTelegramMessage(managerId, text, keyboard)

		return Response.ok({ submitted: true })
	},
}
