import { useState } from 'react'
import s from './Scanner.module.css'

export function Scanner() {
	const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

	function startScan() {
		if (window.Telegram?.WebApp) {
			Telegram.WebApp.showScanQrPopup({ text: 'Наведи камеру на QR-код билета' }, data => {
				Telegram.WebApp.closeScanQrPopup()
				setResult({ ok: true, text: `✅ Билет принят: ${data}` })
			})
		} else {
			setResult({ ok: true, text: '✅ Билет принят (тест)' })
		}
	}

	return (
		<div className={s.wrap}>
			<div className={s.icon}>📷</div>
			<div className={s.title}>QR-сканер билетов</div>
			<div className={s.text}>
				Наведи камеру на QR-код участника для проверки его записи на мероприятие
			</div>
			<button className={s.btn} onClick={startScan}>Сканировать</button>
			{result && (
				<div className={`${s.result} ${result.ok ? s.resultOk : s.resultError}`}>
					{result.text}
				</div>
			)}
		</div>
	)
}
