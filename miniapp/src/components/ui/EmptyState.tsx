import s from './EmptyState.module.css'

interface Props {
	icon: string
	text: string
}

export function EmptyState({ icon, text }: Props) {
	return (
		<div className={s.wrap}>
			<div className={s.icon}>{icon}</div>
			<div className={s.text}>{text}</div>
		</div>
	)
}
