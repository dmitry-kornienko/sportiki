import { useState } from 'react'
import s from './Header.module.css'

const CITIES = [
	{ name: 'Da Nang',    flag: '🇻🇳', active: true },
	{ name: 'Bali',       flag: '🇮🇩', active: false },
	{ name: 'Sri Lanka',  flag: '🇱🇰', active: false },
	{ name: 'Dubai',      flag: '🇦🇪', active: false },
	{ name: 'Phuket',     flag: '🇹🇭', active: false },
]

export function Header() {
	const [open, setOpen] = useState(false)

	return (
		<div className={s.header}>
			<div className={s.logo}>
				<span>Expat Community</span>
				Sportiki
			</div>

			<div className={s.cityWrap}>
				<button className={s.cityBtn} onClick={() => setOpen(v => !v)}>
					<span className={s.cityFlag}>🇻🇳</span>
					<span>Da Nang</span>
					<span className={`${s.chevron} ${open ? s.chevronOpen : ''}`}>▾</span>
				</button>

				{open && (
					<>
						<div className={s.backdrop} onClick={() => setOpen(false)} />
						<div className={s.dropdown}>
							{CITIES.map(city => (
								<div
									key={city.name}
									className={`${s.option} ${city.active ? s.optionActive : s.optionDisabled}`}
									onClick={() => city.active && setOpen(false)}
								>
									<span className={s.optionFlag}>{city.flag}</span>
									<span className={s.optionInfo}>
										<span className={s.optionName}>{city.name}</span>
										{!city.active && <span className={s.optionSoon}>В разработке</span>}
									</span>
									{city.active && <span className={s.optionCheck}>✓</span>}
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	)
}
