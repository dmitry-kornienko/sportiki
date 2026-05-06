import { useState } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { Header } from './components/layout/Header'
import { BottomNav } from './components/layout/BottomNav'
import { Toast, useToast } from './components/ui/Toast'
import { EventsScreen } from './screens/EventsScreen'
import { MerchScreen } from './screens/MerchScreen'
import { ScannerScreen } from './screens/ScannerScreen'
import type { Screen } from './types'
import styles from './App.module.css'

export default function App() {
	const { isAdmin } = useTelegram()
	const [screen, setScreen] = useState<Screen>('events')
	const toast = useToast()

	return (
		<div className={styles.app}>
			<Header />

			<div className={styles.content}>
				{screen === 'events' && <EventsScreen onToast={toast.show} />}
				{screen === 'merch' && <MerchScreen onToast={toast.show} />}
				{screen === 'scanner' && <ScannerScreen />}
			</div>

			<BottomNav current={screen} onNavigate={setScreen} showScanner={isAdmin} />
			<Toast msg={toast.msg} visible={toast.visible} />
		</div>
	)
}
