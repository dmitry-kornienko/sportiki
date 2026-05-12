// ============================================================
// файл: Migrations.js
// Назначение: Разовые миграции данных. Запускать вручную из GAS Editor.
// ============================================================

/**
 * Проставляет TicketId всем регистрациям события 694430 у которых он пустой.
 * Запустить один раз после деплоя в прод.
 */
function migrateTicketIds_694430() {
	const EVENT_ID   = '694430'
	const sheet      = SpreadsheetApp.openById(
		PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
	).getSheetByName('Registrations')

	const data    = sheet.getDataRange().getValues()
	let updated   = 0
	let skipped   = 0

	for (let i = 1; i < data.length; i++) {
		const row = data[i]
		const eventId  = row[COL.REGS.EVENT_ID]?.toString().trim()
		const ticketId = row[COL.REGS.TICKET_ID]?.toString().trim()

		if (eventId !== EVENT_ID) continue

		if (ticketId) {
			skipped++
			continue
		}

		const newTicketId = _generateTicketId()
		sheet.getRange(i + 1, COL.REGS.TICKET_ID + 1).setValue(newTicketId)
		updated++
	}

	console.log(`✅ Готово. Обновлено: ${updated}, уже было: ${skipped}`)
}
