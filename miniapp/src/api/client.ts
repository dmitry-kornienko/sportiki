import { getInitData, getTelegramUserId } from '../utils/telegram'

const API_URL = import.meta.env.VITE_API_URL as string

async function parseResponse<T>(res: Response): Promise<T> {
	let data: { ok: boolean; data?: T; error?: string }
	try {
		data = await res.json()
	} catch {
		throw new Error(`Ошибка сервера (${res.status})`)
	}
	if (!data.ok) throw new Error(data.error ?? 'Неизвестная ошибка')
	return data.data as T
}

export async function get<T>(params: Record<string, string>): Promise<T> {
	const url = new URL(API_URL)
	const initData = getInitData()

	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
	if (initData) url.searchParams.set('initData', initData)
	else url.searchParams.set('userId', getTelegramUserId())

	const res = await fetch(url.toString())
	return parseResponse<T>(res)
}

export async function post<T>(body: Record<string, unknown>): Promise<T> {
	const initData = getInitData()
	const payload = initData
		? { ...body, initData }
		: { ...body, userId: getTelegramUserId() }

	const res = await fetch(API_URL, {
		method: 'POST',
		body: JSON.stringify(payload),
	})
	return parseResponse<T>(res)
}
