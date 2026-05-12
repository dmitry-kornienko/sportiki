import { useState } from 'react'
import { createPortal } from 'react-dom'
import { submitPayment } from '../../api/registrations'
import { formatPrice } from '../../utils/format'
import { useToastAction } from '../../context/ToastContext'
import { Loader } from '../ui/Loader'
import s from './EventDetail.module.css'

interface Props {
	eventId: string
	title: string
	price: number
	onSubmitted: () => void
	onClose: () => void
}

async function compressImage(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		const url = URL.createObjectURL(file)
		img.onload = () => {
			const MAX_DIM = 1500
			let w = img.naturalWidth
			let h = img.naturalHeight
			if (w > MAX_DIM || h > MAX_DIM) {
				if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM }
				else { w = Math.round(w * MAX_DIM / h); h = MAX_DIM }
			}
			const canvas = document.createElement('canvas')
			canvas.width = w
			canvas.height = h
			canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
			URL.revokeObjectURL(url)
			resolve(canvas.toDataURL('image/jpeg', 0.8))
		}
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось прочитать изображение')) }
		img.src = url
	})
}

export function PaymentSheet({ eventId, title, price, onSubmitted, onClose }: Props) {
	const [file, setFile] = useState<File | null>(null)
	const [loading, setLoading] = useState(false)
	const showToast = useToastAction()

	function handleClose() {
		if (loading) return
		setFile(null)
		onClose()
	}

	async function handleSubmit() {
		if (!file || loading) return
		setLoading(true)
		try {
			const base64 = await compressImage(file)
			await submitPayment(eventId, base64)
			onSubmitted()
			showToast('Скриншот отправлен администратору')
			handleClose()
		} catch (e) {
			showToast((e as Error).message)
		} finally {
			setLoading(false)
		}
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
						disabled={loading}
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
				<button className={s.sheetFullBtn} disabled={!file || loading} onClick={handleSubmit}>
					{loading ? <Loader /> : 'Отправить'}
				</button>
			</div>
		</>,
		document.body
	)
}
