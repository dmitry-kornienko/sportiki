import s from './Loader.module.css'

interface Props {
	fullscreen?: boolean
}

export function Loader({ fullscreen }: Props) {
	return (
		<div className={fullscreen ? s.fullscreen : s.inline}>
			<div className={s.dots}>
				<span /><span /><span />
			</div>
		</div>
	)
}
