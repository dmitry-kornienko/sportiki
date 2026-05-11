import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import s from './QrSheet.module.css'

interface Props {
	ticketId: string
	guestTicketId?: string
	eventTitle: string
	onClose: () => void
}

export function QrSheet({ ticketId, guestTicketId, eventTitle, onClose }: Props) {
	return createPortal(
		<>
			<div className={s.backdrop} onClick={onClose} />
			<div className={s.sheet}>
				<div className={s.title}>QR билеты</div>
				<div className={s.eventName}>{eventTitle}</div>

				<div className={s.qrBlock}>
					<div className={s.qrLabel}>Ваш билет</div>
					<div className={s.qrWrap}>
						<QRCodeSVG value={ticketId} size={200} />
					</div>
					<div className={s.qrCode}>{ticketId}</div>
				</div>

				{guestTicketId && (
					<div className={s.qrBlock}>
						<div className={s.qrLabel}>Билет гостя</div>
						<div className={s.qrWrap}>
							<QRCodeSVG value={guestTicketId} size={200} />
						</div>
						<div className={s.qrCode}>{guestTicketId}</div>
					</div>
				)}

				<button className={s.closeBtn} onClick={onClose}>Закрыть</button>
			</div>
		</>,
		document.body,
	)
}
