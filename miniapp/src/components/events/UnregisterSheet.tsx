import { createPortal } from 'react-dom'
import type { Registration } from '../../types'
import s from './EventDetail.module.css'

interface Props {
	guestReg: Registration | null
	loading: boolean
	guestLoading: boolean
	onUnregisterSelf: () => void
	onUnregisterGuest: () => void
	onUnregisterBoth: () => void
	onClose: () => void
}

export function UnregisterSheet({ guestReg, loading, guestLoading, onUnregisterSelf, onUnregisterGuest, onUnregisterBoth, onClose }: Props) {
	return createPortal(
		<>
			<div className={s.sheetBackdrop} onClick={onClose} />
			<div className={s.sheet}>
				<div className={s.sheetTitle}>Отменить запись</div>
				<button className={s.sheetOption} onClick={onUnregisterSelf} disabled={loading}>
					<span className={s.sheetOptionIcon}>👤</span>
					<span>Только мою запись</span>
				</button>
				{guestReg && (
					<>
						<button className={s.sheetOption} onClick={onUnregisterGuest} disabled={guestLoading}>
							<span className={s.sheetOptionIcon}>🙋</span>
							<span>Только гостя ({guestReg.name})</span>
						</button>
						<button className={s.sheetOption} onClick={onUnregisterBoth} disabled={loading}>
							<span className={s.sheetOptionIcon}>👥</span>
							<span>Меня и гостя</span>
						</button>
					</>
				)}
			</div>
		</>,
		document.body
	)
}
