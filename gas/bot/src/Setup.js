// ============================================================
// файл: Setup.js
// Назначение: Служебные функции первичной настройки и диагностики.
// В продакшене не вызываются автоматически.
// ============================================================

// --- ПЕРВИЧНАЯ НАСТРОЙКА ТОКЕНА И ДОСТУПОВ ---
//
// Токен и другие секреты хранятся в Script Properties — НЕ в коде.
// Задать их через интерфейс GAS (один раз, вручную):
//
//   1. Редактор GAS → ⚙️ "Настройки проекта"
//   2. Раздел "Свойства скрипта" → "Изменить свойства скрипта"
//   3. Добавить четыре строки:
//
//      BOT_TOKEN       → токен от @BotFather
//      WEBHOOK_SECRET  → любая строка, например: mybot-secret-2026
//      OWNER_ID        → твой Telegram ID (узнать у @userinfobot)
//      ADMIN_IDS       → ID дополнительных админов через запятую
//
//   4. Сохранить — готово. Код читает их автоматически через getBotToken() и др.
//
// После этого выполнить по порядку:
//   registerWebhook() → setupTrigger()

function ping() {
	console.log('✅ Deployed at: ' + new Date().toISOString())
}

function clearWebhookQueue() {
	const token = getBotToken()
	// Удаляем webhook
	UrlFetchApp.fetch(
		`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`,
	)
	// Регистрируем заново
	const webAppUrl =
		'https://script.google.com/macros/s/AKfycbxFSH-okbj-P6E_P7ZQ6tPnPzZWYmULslEk8thrN6Le-g8Y5jNsn9MKgli1llQw34ykTQ/exec'
	const secret = getWebhookSecret()
	UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
		method: 'post',
		contentType: 'application/json',
		payload: JSON.stringify({
			url: webAppUrl,
			secret_token: secret,
			allowed_updates: ['message', 'callback_query'],
			drop_pending_updates: true,
		}),
	})
	console.log('Очередь сброшена, webhook перерегистрирован')
}

/**
 * Шаг 1: Регистрирует webhook в Telegram.
 * Запустить вручную из редактора GAS после настройки Script Properties.
 * При каждом новом деплое GAS запускать заново — URL деплоя меняется.
 */
function registerWebhook() {
	const token = getBotToken()
	const secret = getWebhookSecret()

	// URL берётся из: "Развернуть" → "Управление развёртываниями" → скопировать URL
	const webAppUrl =
		'https://script.google.com/macros/s/AKfycbxFSH-okbj-P6E_P7ZQ6tPnPzZWYmULslEk8thrN6Le-g8Y5jNsn9MKgli1llQw34ykTQ/exec'

	const response = UrlFetchApp.fetch(
		`https://api.telegram.org/bot${token}/setWebhook`,
		{
			method: 'post',
			contentType: 'application/json',
			payload: JSON.stringify({
				url: webAppUrl,
				secret_token: secret,
				allowed_updates: ['message', 'callback_query'],
			}),
		},
	)

	console.log('Ответ Telegram: ' + response.getContentText())
}

/**
 * Шаг 2: Устанавливает триггер автоматической рассылки напоминаний.
 * Запускать после registerWebhook().
 * Перед повторным запуском старый триггер удаляется автоматически.
 */
function setupTrigger() {
	ScriptApp.getProjectTriggers()
		.filter(t => t.getHandlerFunction() === 'checkAndSendReminders')
		.forEach(t => ScriptApp.deleteTrigger(t))

	ScriptApp.newTrigger('checkAndSendReminders')
		.timeBased()
		.everyHours(1)
		.create()

	console.log('✅ Триггер рассылки напоминаний установлен (каждый час).')
}

/**
 * Диагностика: показывает текущий статус webhook.
 */
function checkWebhook() {
	const response = UrlFetchApp.fetch(
		`https://api.telegram.org/bot${getBotToken()}/getWebhookInfo`,
	)
	console.log('Webhook info: ' + response.getContentText())
}

/**
 * Диагностика: проверяет что все Script Properties заданы.
 * Токен не логируется — только факт наличия.
 */
function checkProperties() {
	const props = getScriptProps().getProperties()
	console.log('OWNER_ID: ' + (props['OWNER_ID'] || '❌ не задан'))
	console.log('ADMIN_IDS: ' + (props['ADMIN_IDS'] || '❌ не задан'))
	console.log('BOT_TOKEN: ' + (props['BOT_TOKEN'] ? '✅ задан' : '❌ не задан'))
	console.log(
		'WEBHOOK_SECRET: ' + (props['WEBHOOK_SECRET'] ? '✅ задан' : '❌ не задан'),
	)
}
