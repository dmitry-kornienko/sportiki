// ============================================================
// файл: Texts.js
// Назначение: Все тексты уведомлений, отправляемых через Telegram API.
// ============================================================

const Texts = {
	/**
	 * Напоминание за 24 часа до события.
	 */
	reminder({ event, isMe, guestCount }) {
		let who
		if (isMe && guestCount > 0) who = 'вы с гостем'
		else if (isMe) who = 'ты'
		else who = 'твой гость'

		const eventLine = (event.type ? event.type + ' ' : '') + '<b>' + event.title + '</b>'
		const whoText = (isMe && guestCount > 0) ? 'Вы с гостем' : 'Ты'
		return (
			`👋 Напоминаем о твоей записи!\n\n` +
			`${eventLine}\n` +
			`📅 ${event.date}  🕐 ${event.time}\n\n` +
			`${whoText} в списке участников. Ждём! Подтверди участие 👇`
		)
	},



	/**
	 * Участник отменил запись → человека из резерва перевели в основной состав.
	 */
	promoted({ eventLine, date, time }) {
		return (
			`🎉 Хорошие новости!\n\n` +
			`Освободилось место, и вы переведены из резерва в основной состав:\n${eventLine}\n\n` +
			`📅 ${date}\n🕐 ${time}\n\n` +
			`До встречи на старте 🙌`
		)
	},

	/**
	 * Ребалансировка: лимит вырос → перевод из резерва в основной состав.
	 */
	rebalancePromoted({ eventLine, date, time }) {
		return (
			`🎉 Отличные новости!\n\n` +
			`Вы в основном составе на событие:\n${eventLine}\n\n` +
			`📅 ${date}\n🕐 ${time}\n\n` +
			`До встречи на старте 🙌`
		)
	},

	/**
	 * Ребалансировка: лимит уменьшился → перевод из основного состава в резерв.
	 */
	rebalanceDemoted({ eventLine, date, time }) {
		return (
			`ℹ️ Обновление по вашей записи:\n\n` +
			`Из-за изменения лимита участников вы были переведены в резерв на событие:\n${eventLine}\n\n` +
			`📅 ${date}\n🕐 ${time}\n\n` +
			`Если место освободится — вы автоматически попадёте в основной состав 👍`
		)
	},

	/**
	 * Уведомление администраторам о новом платеже.
	 */
	paymentNotification({ eventLine, date, time, amount, userName, username, guestName }) {
		const userDisplay = username ? `${userName} (${username})` : userName
		const guestLine   = guestName ? `\n👥 + гость: ${guestName}` : ''
		return (
			`💳 <b>Новый платёж!</b>\n\n` +
			`👤 ${userDisplay}${guestLine}\n` +
			`${eventLine}\n` +
			`📅 ${date} / ${time}\n` +
			`💰 ${amount}`
		)
	},

	/**
	 * Уведомление пользователю об успешном подтверждении оплаты.
	 */
	paymentConfirmed({ eventLine, date, time, amount }) {
		return (
			`✅ Ваша оплата подтверждена!\n\n` +
			`${eventLine}\n\n` +
			`📅 ${date}\n🕐 ${time}\n` +
			`💰 ${amount}\n\n` +
			`Ждём вас на событии 🙌`
		)
	},

	/**
	 * Ребалансировка: резерв переполнен → запись удалена.
	 */
	rebalanceDeleted({ eventLine, date, time }) {
		return (
			`😔 К сожалению, организатор уменьшил лимит участников, поэтому ваша запись была отменена.\n\n` +
			`Событие:\n${eventLine}\n\n` +
			`📅 ${date}\n🕐 ${time}\n\n` +
			`Вы можете записаться снова, если появятся свободные места.`
		)
	},

	/**
	 * Уведомление менеджеру мерча о новом заказе.
	 */
	newMerchOrder({ userDisplay, chatId, itemsList, total }) {
		return (
			`🛍 <b>Новый заказ мерча!</b>\n\n` +
			`👤 ${userDisplay}\n` +
			`🆔 <code>${chatId}</code>\n\n` +
			`${itemsList}\n\n` +
			`💰 Итого: <b>${total}</b>`
		)
	},
}
