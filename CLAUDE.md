# CLAUDE.md — Sportiki

## ПРОЕКТ

**Sportiki** — Telegram Mini App для экспат-комьюнити Da Nang (Вьетнам).
Запись на события, мерч-магазин, проверка QR-билетов.

---

## СТРУКТУРА

```
sportiki/
├── miniapp/          ← React 18 + TypeScript + Vite → GitHub Pages
│   └── src/
│       ├── api/          ← client.ts, events.ts, registrations.ts
│       ├── components/
│       │   ├── events/   ← EventCard, EventDetail, CreateEventSheet
│       │   ├── merch/    ← ProductCard, ProductDetail, Cart
│       │   ├── scanner/  ← Scanner
│       │   ├── layout/   ← Header, BottomNav
│       │   └── ui/       ← Toast, EmptyState, Loader
│       ├── hooks/        ← useEvents, useCart, useTelegram
│       ├── screens/      ← EventsScreen, MerchScreen, ScannerScreen
│       ├── types/        ← index.ts
│       ├── data/         ← products.ts (товары захардкожены)
│       └── utils/        ← format.ts, telegram.ts
├── gas/
│   ├── bot/          ← Telegram бот (стабильный, не трогаем без нужды)
│   └── api/          ← REST API поверх Google Sheets
│       └── src/      ← Config.js, Router.js, Auth.js, Database.js
│                        EventsController.js, RegistrationsController.js
│                        UsersController.js, Response.js
└── .github/workflows/ ← deploy-bot/api/miniapp (main) + deploy-miniapp-dev (dev)
```

---

## TELEGRAM БОТ (`gas/bot`)

**Роль:** `/start` → меню + кнопка Mini App, уведомления о ребалансе, напоминания за 24ч, рассылки, приём мерч-заказов через Web App Data.

Весь пользовательский UI переехал в Mini App. **Бот не трогаем без необходимости.**

**Script Properties:** `BOT_TOKEN`, `WEBHOOK_SECRET`, `OWNER_ID`, `ADMIN_IDS`, `MERCH_MANAGER_ID`

**Важно:** `doPost` без `return ContentService.createTextOutput()` — иначе Telegram дублирует запросы.

---

## GAS API (`gas/api`)

**Endpoints:**

| Метод | action | Контроллер |
|-------|--------|------------|
| GET | `events` | EventsController.list |
| GET | `event&id=X` | EventsController.get |
| GET | `registrations` | RegistrationsController.list |
| GET | `me` | UsersController.me |
| POST | `register_user` | UsersController.registerUser |
| POST | `register` | RegistrationsController.create |
| POST | `unregister` | RegistrationsController.remove |
| POST | `register_guest` | RegistrationsController.registerGuest |
| POST | `unregister_guest` | RegistrationsController.removeGuest |
| POST | `create_event` | EventsController.create |
| POST | `update_event` | EventsController.update + _rebalance |

**Формат:** `{ ok: true, data: {...} }` / `{ ok: false, error: '...' }`

**Auth:** `X-Telegram-Init-Data` header → `Auth.js` верифицирует HMAC-SHA256.
⚠️ Использовать `computeHmacSignature` с `Byte[]`, НЕ `computeHmacSha256Signature` со строкой.

**Ребаланс при `update_event`** (`EventsController._rebalance`):
- `maxPeople` вырос → продвигает из резерва в основу с уведомлением
- `maxPeople` уменьшился → демоутит лишних в резерв; при переполнении — удаляет с уведомлением
- `maxPeople` → 0 (без лимита) → переводит всех резервников в основу с уведомлением
- `reserveLimit` уменьшился → удаляет лишних из резерва с уведомлением

**Script Properties:** `BOT_TOKEN`, `SPREADSHEET_ID`, `ALLOWED_ORIGINS`

---

## MINI APP (`miniapp`)

**Стек:** React 18, TypeScript, Vite, CSS Modules, GitHub Pages

**Экраны** (нижняя панель):
- **EventsScreen** — список событий, детали, регистрация/отмена, гости, создание/редактирование (admin)
- **MerchScreen** — каталог (2 товара в `data/products.ts`) + корзина → `sendData` в бот
- **ScannerScreen** — QR сканер (только admin, каркас)

**Определение admin:**
```ts
const ADMIN_IDS = ['1771173222', '1397144271']
const isAdmin = ADMIN_IDS.includes(String(tg?.initDataUnsafe?.user?.id))
```

**Env:**
```
VITE_API_URL=https://script.google.com/macros/s/.../exec
VITE_BASE=/sportiki/    # или /sportiki/dev/
```

**Шторки/модалки** → всегда `createPortal`, иначе iOS overflow ломает z-index.

---

## GOOGLE SHEETS

→ Детальная схема колонок: [SHEETS.md](SHEETS.md)

Листы: **Events** (12 cols), **Registrations** (9 cols), **Users** (5 cols), **States** (только бот)

**Статусы событий:** `Registration_Open` | `Registration_Closed` | `Archived`
**Статусы регистраций:** `MAIN` | `RESERVE`
**Константы (GAS API Config.js):** `DEFAULT_RESERVE_LIMIT = 20`, `LIMITS.PER_USER = 2`

---

## ОКРУЖЕНИЯ

| | Dev | Prod |
|--|-----|------|
| Mini App | localhost:5173 | dmitry-kornienko.github.io/sportiki |
| GAS API | dev script | prod script |
| GAS Bot | @sportiki_danaga_test_bot | основной бот |
| Таблица | dev spreadsheet | prod spreadsheet |

CI/CD — GitHub Actions: `main` → прод (бот + API + Mini App), `dev` → dev Mini App.

---

## КОМАНДЫ

```bash
npm run miniapp:dev          # Vite dev server
npm run miniapp:build        # Сборка

npm run api:deploy:dev       # Деплой API в dev GAS
npm run api:deploy:prod      # Деплой API в prod GAS

npm run bot:deploy:dev       # Деплой бота в dev GAS
npm run bot:deploy:prod      # Деплой бота в prod GAS
```

---

## ПРИНЦИПЫ

**GAS:** Repository pattern, `db` как единая точка входа, `Database.js` одинаковый в боте и API, все тексты в `Texts.js`, клавиатуры в `Keyboards.js`, никакой бизнес-логики в роутере.

**React:** Функциональные компоненты + хуки, CSS Modules, никаких `any`, mobile-first.

**Общее:** Именованные константы, секреты только в Script Properties / `.env`.

---

## НЕ РЕАЛИЗОВАНО

- QR-билеты: генерация токена при регистрации + `GET ?action=ticket` endpoint
- Подтверждение оплаты (upload чека → статус Confirmed в Sheets)
- Уведомления при открытии/закрытии записи и отмене события
- Мерч через API (`POST ?action=order`) вместо `sendData`
