import { createContext, useContext, type ReactNode } from 'react'
import { useToast, Toast } from '../components/ui/Toast'

const ToastContext = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
	const toast = useToast()
	return (
		<ToastContext.Provider value={toast.show}>
			{children}
			<Toast msg={toast.msg} visible={toast.visible} />
		</ToastContext.Provider>
	)
}

export function useToastAction(): (msg: string) => void {
	return useContext(ToastContext)
}
