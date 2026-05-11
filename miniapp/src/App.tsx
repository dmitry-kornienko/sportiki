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
	const { canScan } = useTelegram()
	const [screen, setScreen] = useState<Screen>('events')

	const initialEventId = new URLSearchParams(window.location.search).get('eventId') ?? undefined

	return (
		<ToastProvider>
			<div className={styles.app}>
				<Header />
				<div className={styles.content}>
					{screen === 'events' && <EventsScreen initialEventId={initialEventId} />}
					{screen === 'merch' && <MerchScreen />}
					{screen === 'scanner' && <ScannerScreen />}
				</div>
				<BottomNav current={screen} onNavigate={setScreen} showScanner={canScan} />
			</div>
		</ToastProvider>
	)
}
