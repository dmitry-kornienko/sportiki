import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from '../ui/Loader'
import s from './EventDetail.module.css'

interface Props {
	canRegisterWithGuest: boolean
	hasGuest: boolean
	loading: boolean
	onRegisterOnly: () => void
	onRegisterWithGuest: (guestName: string) => void
	onClose: () => void
}

export function RegisterSheet({ canRegisterWithGuest, hasGuest, loading, onRegisterOnly, onRegisterWithGuest, onClose }: Props) {
	const [showGuestCard, setShowGuestCard] = useState(false)
	const [guestName, setGuestName] = useState('')

	function handleClose() {
		setGuestName('')
		setShowGuestCard(false)
		onClose()
	}

	return createPortal(
		<>
			<div className={s.sheetBackdrop} onClick={handleClose} />
			<div className={s.sheet}>
				<div className={s.sheetTitle}>Ты будешь один?</div>
				<button className={s.sheetOption} onClick={onRegisterOnly} disabled={loading}>
					<span className={s.sheetOptionIcon}>👤</span>
					<span>Да, только я</span>
				</button>
				{!hasGuest && canRegisterWithGuest && (
					<div
						className={`${s.sheetCard} ${showGuestCard ? s.sheetCardOpen : ''}`}
						onClick={() => { if (!showGuestCard) setShowGuestCard(true) }}
					>
						<div className={s.sheetCardHeader}>
							<span className={s.sheetOptionIcon}>👥</span>
							<span>Я приду с гостем</span>
						</div>
						{showGuestCard && (
							<div className={s.sheetGuestExpanded} onClick={e => e.stopPropagation()}>
								<input
									className={s.sheetInput}
									placeholder="Имя гостя"
									value={guestName}
									onChange={e => setGuestName(e.target.value)}
									autoFocus
								/>
								<button
									className={`${s.sheetGuestBtn} ${loading ? s.sheetGuestBtnLoading : ''}`}
									onClick={() => onRegisterWithGuest(guestName)}
									disabled={loading || !guestName.trim()}
								>
									{loading ? <Loader /> : 'Записать'}
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</>,
		document.body
	)
}
