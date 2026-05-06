import { Scanner } from '../components/scanner/Scanner'
import s from './ScannerScreen.module.css'

export function ScannerScreen() {
	return (
		<div className={s.screen}>
			<div className={s.title}>Сканер</div>
			<div className={s.sub}>Проверка билетов участников</div>
			<Scanner />
		</div>
	)
}
