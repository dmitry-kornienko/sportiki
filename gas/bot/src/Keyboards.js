// ============================================================
// файл: Keyboards.js
// Назначение: Формирование inline-клавиатур для Telegram.
// ============================================================

const Keyboards = {
	mainMenu(events, chatId) {
		const buttons = [[{ text: Texts.buttons.goToChannel, url: CHANNEL_URL }]]

		events.forEach(ev => {
			const isClosed = ev.status === STATUSES.CLOSED
			const label = isClosed
				? `${ev.date} — ${ev.title} (Full)`
				: `${ev.date} — ${ev.title}`
			buttons.push([{ text: label, callback_data: `event_info_${ev.id}` }])
		})

		buttons.push([{ text: Texts.buttons.myRegs, callback_data: 'my_regs' }])
		buttons.push([{ text: '🏃 Открыть Sportiki', web_app: { url: MINI_APP_URL } }])

		if (isAdmin(chatId)) {
			buttons.push([
				{
					text: Texts.buttons.adminCreate,
					callback_data: 'admin_create_event',
				},
			])
			buttons.push([
				{
					text: Texts.buttons.adminBroadcast,
					callback_data: 'admin_broadcast',
				},
			])
		}

		return { inline_keyboard: buttons }
	},

	eventAction(
		eventId,
		userStatus,
		occupiedTotal,
		maxPeople,
		chatId,
		mainCount = 0,
	) {
		const buttons = []
		const totalLimit = maxPeople > 0 ? maxPeople + RESERVE_LIMIT : Infinity
		const hasSpace = maxPeople === 0 || occupiedTotal < totalLimit

		const counterLabel =
			maxPeople > 0
				? `👥 Кто идёт? (${mainCount}/${maxPeople})`
				: `👥 Кто идёт? (${mainCount})`
		buttons.push([
			{ text: counterLabel, callback_data: `show_parts_${eventId}` },
		])

		if (userStatus.isMe) {
			buttons.push([
				{
					text: Texts.buttons.cancelMe,
					callback_data: `confirm_del_me_${eventId}`,
				},
			])
		} else if (hasSpace) {
			buttons.push([
				{ text: Texts.buttons.register, callback_data: `reg_start_${eventId}` },
			])
		}

		if (userStatus.guestCount > 0) {
			buttons.push([
				{
					text: Texts.buttons.cancelGuest,
					callback_data: `confirm_del_guest_${eventId}`,
				},
			])
		} else if (hasSpace) {
			buttons.push([
				{ text: Texts.buttons.addGuest, callback_data: `reg_guest_${eventId}` },
			])
		}

		if (userStatus.isMe && userStatus.guestCount > 0) {
			buttons.push([
				{
					text: Texts.buttons.cancelAll,
					callback_data: `confirm_del_all_${eventId}`,
				},
			])
		}

		if (isAdmin(chatId)) {
			buttons.push([
				{
					text: Texts.buttons.adminManageParts,
					callback_data: `adm_parts_${eventId}`,
				},
			])
			buttons.push([
				{
					text: Texts.buttons.adminEditEvent,
					callback_data: `adm_edit_event_${eventId}`,
				},
			])
			buttons.push([
				{
					text: Texts.buttons.adminArchiveEvent,
					callback_data: `admin_pre_arch_${eventId}`,
				},
			])
		}

		buttons.push([
			{ text: Texts.buttons.backToList, callback_data: 'back_to_list' },
		])
		return { inline_keyboard: buttons }
	},

	// Меню выбора поля для редактирования события
	adminEditMenu(eventId) {
		return {
			inline_keyboard: [
				[
					{
						text: '🎯 Эмоджи',
						callback_data: `adm_edit_field_${eventId}_type`,
					},
					{
						text: '📝 Название',
						callback_data: `adm_edit_field_${eventId}_title`,
					},
				],
				[
					{ text: '📅 Дата', callback_data: `adm_edit_field_${eventId}_date` },
					{ text: '⏰ Время', callback_data: `adm_edit_field_${eventId}_time` },
				],
				[
					{
						text: '📋 Описание',
						callback_data: `adm_edit_field_${eventId}_info`,
					},
					{
						text: '📍 Локация',
						callback_data: `adm_edit_field_${eventId}_location`,
					},
				],
				[{ text: '✏️ Лимит мест', callback_data: `adm_edit_max_${eventId}` }],
				[
					{
						text: Texts.buttons.backToEvent,
						callback_data: `event_info_${eventId}`,
					},
				],
			],
		}
	},

	adminConfirmArchive(eventId) {
		return {
			inline_keyboard: [
				[
					{
						text: Texts.buttons.confirmAdminArchive,
						callback_data: `admin_final_arch_${eventId}`,
					},
					{
						text: Texts.buttons.cancelAdminArchive,
						callback_data: `event_info_${eventId}`,
					},
				],
			],
		}
	},

	adminParticipantsList(eventId, participants) {
		const buttons = participants.map((p, index) => {
			const hasNick =
				p.username && p.username !== 'no_link' && p.username !== 'no_username'
			const guestTag = p.isGuest ? 'Г: ' : ''
			const nick = hasNick ? ` (${p.username})` : ''
			const label = `${guestTag}${p.name}${nick}`
			const status = p.status === STATUSES.RESERVE ? ' ⏳' : ''

			return [
				{ text: `${label}${status}`, callback_data: 'ignore' },
				{
					text: Texts.buttons.deletePart,
					callback_data: `adm_del_p_${eventId}_${index}`,
				},
			]
		})

		buttons.push([
			{
				text: Texts.buttons.backToEvent,
				callback_data: `event_info_${eventId}`,
			},
		])
		return { inline_keyboard: buttons }
	},

	myRegsActions(regs) {
		const seen = new Set()
		const buttons = []

		regs.forEach(r => {
			if (!seen.has(r.eventId)) {
				seen.add(r.eventId)
				buttons.push([
					{
						text: `${Texts.buttons.manageEvent}${r.eventTitle}`,
						callback_data: `event_info_${r.eventId}`,
					},
				])
			}
		})

		buttons.push([
			{ text: Texts.buttons.signUpMore, callback_data: 'back_to_list' },
		])
		return { inline_keyboard: buttons }
	},

	confirmDelete(eventId, type) {
		return {
			inline_keyboard: [
				[
					{
						text: Texts.buttons.confirmDelete,
						callback_data: `delete_${type}_${eventId}`,
					},
					{
						text: Texts.buttons.rejectDelete,
						callback_data: `event_info_${eventId}`,
					},
				],
			],
		}
	},

	confirmParticipation(eventId) {
		return {
			inline_keyboard: [
				[
					{
						text: Texts.buttons.checkinYes,
						callback_data: `checkin_yes_${eventId}`,
					},
					{
						text: Texts.buttons.checkinNo,
						callback_data: `checkin_no_${eventId}`,
					},
				],
			],
		}
	},

	confirmCancelCheckin(eventId, userStatus) {
		const buttons = []

		if (userStatus.isMe && userStatus.guestCount === 0) {
			buttons.push([
				{
					text: '🔥 Да, отменить запись',
					callback_data: `delete_me_${eventId}`,
				},
				{ text: '🔙 Назад', callback_data: `abort_cancel_${eventId}` },
			])
		}

		if (!userStatus.isMe && userStatus.guestCount > 0) {
			buttons.push([
				{
					text: '🔥 Да, отменить запись гостя',
					callback_data: `delete_guest_${eventId}`,
				},
				{ text: '🔙 Назад', callback_data: `abort_cancel_${eventId}` },
			])
		}

		if (userStatus.isMe && userStatus.guestCount > 0) {
			buttons.push([
				{
					text: '❌ Отменить мою запись',
					callback_data: `delete_me_${eventId}`,
				},
			])
			buttons.push([
				{
					text: '❌ Отменить запись гостя',
					callback_data: `delete_guest_${eventId}`,
				},
			])
			buttons.push([
				{ text: '🚫 Отменить всё', callback_data: `delete_all_${eventId}` },
			])
			buttons.push([
				{ text: '🔙 Назад', callback_data: `abort_cancel_${eventId}` },
			])
		}

		return { inline_keyboard: buttons }
	},

	backToEvent(eventId) {
		return {
			inline_keyboard: [
				[
					{
						text: Texts.buttons.backToEvent,
						callback_data: `event_info_${eventId}`,
					},
				],
			],
		}
	},

	// Меню выбора аудитории рассылки
	broadcastMenu() {
		return {
			inline_keyboard: [
				[{ text: '👥 Всем пользователям', callback_data: 'adm_broadcast_all' }],
				[{ text: '🎯 По событию', callback_data: 'adm_broadcast_event' }],
				[{ text: Texts.buttons.backToList, callback_data: 'back_to_list' }],
			],
		}
	},

	// Список событий для выбора аудитории рассылки
	broadcastEventList(events) {
		const buttons = events.map(ev => [
			{
				text: `${ev.date} — ${ev.title}`,
				callback_data: `adm_broadcast_ev_${ev.id}`,
			},
		])
		buttons.push([
			{ text: Texts.buttons.backToList, callback_data: 'back_to_list' },
		])
		return { inline_keyboard: buttons }
	},

	// Подтверждение рассылки
	broadcastConfirm(target) {
		return {
			inline_keyboard: [
				[
					{
						text: '📢 Отправить',
						callback_data: `adm_broadcast_send_${target}`,
					},
				],
				[{ text: '❌ Отменить', callback_data: 'back_to_list' }],
			],
		}
	},
}
