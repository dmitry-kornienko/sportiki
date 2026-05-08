import { useState } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { ToastProvider } from './context/ToastContext'
import { EventsScreen } from './screens/EventsScreen'
import { MerchScreen } from './screens/MerchScreen'
import { ScannerScreen } from './screens/ScannerScreen'
import type { Screen } from './types'
import styles from './App.module.css'

export default function App() {
	const { isAdmin } = useTelegram()
	const [screen, setScreen] = useState<Screen>('events')

	return (
		<ToastProvider>
			<div className={styles.app}>
				<Header />
				<div className={styles.content}>
					{screen === 'events' && <EventsScreen />}
					{screen === 'merch' && <MerchScreen />}
					{screen === 'scanner' && <ScannerScreen />}
				</div>
				<BottomNav current={screen} onNavigate={setScreen} showScanner={isAdmin} />
			</div>
		</ToastProvider>
	)
}
