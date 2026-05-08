import { useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice } from '../../utils/format'
import s from './EventDetail.module.css'

interface Props {
	title: string
	price: number
	onClose: () => void
}

export function PaymentSheet({ title, price, onClose }: Props) {
	const [file, setFile] = useState<File | null>(null)

	function handleClose() {
		setFile(null)
		onClose()
	}

	return createPortal(
		<>
			<div className={s.sheetBackdrop} onClick={handleClose} />
			<div className={s.sheet}>
				<div className={s.sheetTitle}>Подтверждение оплаты</div>
				<div className={s.paySheetEvent}>{title} — {formatPrice(price)}</div>
				<label className={s.payUploadArea}>
					<input
						type="file"
						accept="image/*"
						className={s.payFileInput}
						onChange={e => setFile(e.target.files?.[0] ?? null)}
					/>
					{file ? (
						<div className={s.payFileName}>📎 {file.name}</div>
					) : (
						<>
							<div className={s.payUploadIcon}>📷</div>
							<div className={s.payUploadText}>Загрузить скриншот перевода</div>
						</>
					)}
				</label>
				<button className={s.sheetFullBtn} disabled={!file}>Отправить</button>
			</div>
		</>,
		document.body
	)
}
