import { useState, useCallback, useRef } from 'react'
import s from './Toast.module.css'

export function useToast() {
	const [msg, setMsg] = useState('')
	const [visible, setVisible] = useState(false)
	const timer = useRef<ReturnType<typeof setTimeout>>()

	const show = useCallback((text: string) => {
		setMsg(text)
		setVisible(true)
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setVisible(false), 2200)
	}, [])

	return { msg, visible, show }
}

interface Props {
	msg: string
	visible: boolean
}

export function Toast({ msg, visible }: Props) {
	return <div className={`${s.toast} ${visible ? s.show : ''}`}>{msg}</div>
}
