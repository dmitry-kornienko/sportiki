import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from '../ui/Loader'
import s from './EventDetail.module.css'

interface Props {
	loading: boolean
	onAdd: (guestName: string) => void
	onClose: () => void
}

export function GuestSheet({ loading, onAdd, onClose }: Props) {
	const [name, setName] = useState('')

	function handleClose() {
		setName('')
		onClose()
	}

	return createPortal(
		<>
			<div className={s.sheetBackdrop} onClick={handleClose} />
			<div className={s.sheet}>
				<div className={s.sheetTitle}>Добавить гостя</div>
				<input
					className={s.sheetInput}
					placeholder="Имя гостя"
					value={name}
					onChange={e => setName(e.target.value)}
					autoFocus
				/>
				<button
					className={`${s.sheetFullBtn} ${loading ? s.sheetFullBtnLoading : ''}`}
					onClick={() => onAdd(name)}
					disabled={loading || !name.trim()}
				>
					{loading ? <Loader /> : 'Добавить'}
				</button>
			</div>
		</>,
		document.body
	)
}
