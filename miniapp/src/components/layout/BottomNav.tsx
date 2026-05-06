import type { Screen } from '../../types'
import s from './BottomNav.module.css'

interface Props {
	current: Screen
	onNavigate: (screen: Screen) => void
	showScanner: boolean
}

const TABS: { id: Screen; icon: string; label: string }[] = [
	{ id: 'events', icon: '📅', label: 'События' },
	{ id: 'merch', icon: '👕', label: 'Мерч' },
	{ id: 'scanner', icon: '🎫', label: 'Сканер' },
]

export function BottomNav({ current, onNavigate, showScanner }: Props) {
	const tabs = showScanner ? TABS : TABS.filter(t => t.id !== 'scanner')

	return (
		<nav className={s.nav}>
			{tabs.map(tab => (
				<button
					key={tab.id}
					className={`${s.btn} ${current === tab.id ? s.active : ''}`}
					onClick={() => onNavigate(tab.id)}
				>
					<span className={s.icon}>{tab.icon}</span>
					<span className={s.label}>{tab.label}</span>
				</button>
			))}
		</nav>
	)
}
