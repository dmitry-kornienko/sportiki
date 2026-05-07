# CLAUDE.md — Sportiki Project

## ОБЗОР ПРОЕКТА

**Sportiki** — платформа для экспат-комьюнити Da Nang (Вьетнам).
Автоматизирует запись на спортивные и социальные активности, управление мерч-магазином и проверку билетов.

---

## МОНОРЕПО СТРУКТУРА

```
sportiki/
├── miniapp/                    ← React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         ← Header, BottomNav
│   │   │   ├── merch/          ← ProductGrid, ProductCard, Cart, ...
│   │   │   ├── events/         ← EventList, EventCard, ...
│   │   │   ├── scanner/        ← Scanner
│   │   │   └── ui/             ← Toast, Overlay, EmptyState, Button, ...
│   │   ├── screens/            ← EventsScreen, MerchScreen, ScannerScreen
│   │   ├── hooks/              ← useCart, useTelegram, useEvents
│   │   ├── types/              ← index.ts (все типы)
│   │   ├── data/               ← products.ts (захардкоженные товары)
│   │   ├── api/                ← клиент для GAS API
│   │   │   ├── client.ts       ← базовый fetch wrapper
│   │   │   ├── events.ts       ← запросы к /events
│   │   │   └── registrations.ts
│   │   ├── utils/              ← format.ts, telegram.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   │   └── images/             ← фото товаров
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── gas/
│   ├── bot/                    ← Telegram бот (стабильный, не трогаем без нужды)
│   │   ├── src/
│   │   │   ├── Config.js
│   │   │   ├── Database.js
│   │   │   ├── Validator.js
│   │   │   ├── Texts.js
│   │   │   ├── Keyboards.js
│   │   │   ├── Admin.js
│   │   │   ├── Main.js
│   │   │   ├── Reminders.js
│   │   │   │── Setup.js
│   │   │   └── appsscript.json
│   │   ├── .clasp.dev.json
│   │   ├── .clasp.prod.json
│   │   └── package.json        ← clasp скрипты для бота
│   │
│   └── api/                    ← GAS REST API (строим параллельно)
│       ├── src/
│       │   ├── Config.js       ← общие константы, доступ к Sheets
│       │   ├── Database.js     ← тот же слой данных что и в боте
│       │   ├── Router.js       ← doGet/doPost → контроллеры
│       │   ├── Auth.js         ← проверка Telegram initData
│       │   ├── EventsController.js
│       │   ├── RegistrationsController.js
│       │   ├── UsersController.js
│       │   ├── Response.js     ← helpers: ok(), error()
│       │   └── appsscript.json
│       ├── .clasp.dev.json
│       ├── .clasp.prod.json
│       └── package.json        ← clasp скрипты для API
│
├── .github/
│   └── workflows/
│       ├── deploy-bot.yml      ← пуш бота при merge в main
│       ├── deploy-api.yml      ← пуш API при merge в main
│       └── deploy-miniapp.yml  ← сборка и деплой на GitHub Pages
│
├── CLAUDE.md                   ← этот файл
├── .gitignore
└── package.json                ← корневой, делегирует через --prefix
```

---

## ЧАСТЬ 1: TELEGRAM БОТ (`gas/bot`)

### Назначение (сейчас и навсегда)

Бот остаётся как:

- **Точка входа** — `/start` → приветствие + кнопка открыть Mini App
- **Система уведомлений** — напоминания за 24ч, перевод из резерва
- **Рассылки** — массовые сообщения от админа (всем / по событию)
- **Уведомления мерча** — сообщение менеджеру о новом заказе

Весь пользовательский функционал (события, регистрация, мерч) постепенно переезжает в Mini App.

### Стек

- Google Apps Script (V8 runtime)
- Google Sheets как БД
- Telegram Bot API

### Script Properties (настраивать отдельно для dev и prod)

| Ключ               | Описание                                 |
| ------------------ | ---------------------------------------- |
| `BOT_TOKEN`        | Токен Telegram бота                      |
| `WEBHOOK_SECRET`   | Секрет для верификации webhook           |
| `OWNER_ID`         | Telegram ID владельца                    |
| `ADMIN_IDS`        | Telegram ID доп. админов (через запятую) |
| `MERCH_MANAGER_ID` | Telegram ID менеджера магазина           |

### Google Sheets — структура

**Events**
| ID | Type | Title | Date | Time | MaxPeople | Info | Status | Location | ReminderSent |

**Registrations**
| ChatID | EventID | Name | RegDate | Status | Username | TgName | IsGuest | Confirmation |

**Users**
| ChatID | Username | FirstName | CreatedAt | LastSeen |

**States**
| ChatID | State | TempData |

### Ключевые решения

- `doPost` — без `return ContentService.createTextOutput()` (с ним Telegram дублирует запросы)
- `SheetCache` — кэш данных на время одного запроса
- `withLock()` — защита от race conditions при регистрации
- `editMessageText` — редактирование сообщений вместо новых при навигации
- `UserRepository.register()` — не обновляет существующих (оптимизация)
- `_formatDate/_formatTime` — конвертация Date объектов GAS → строки

### Статусы событий

- `Registration_Open` — открыта запись
- `Registration_Closed` — запись закрыта
- `Archived` — архив

### Статусы регистраций

- `MAIN` — основной состав
- `RESERVE` — резерв (лимит +20 мест)

### Лимиты

- `RESERVE_LIMIT = 20`
- `REG_LIMIT_PER_USER = 2` (сам + гость)

---

## ЧАСТЬ 2: GAS API (`gas/api`)

### Назначение

Чистый REST API поверх тех же Google Sheets. Mini App общается только с ним.
Строится параллельно с ботом, постепенно забирает функционал.

### Архитектура

```
doGet(e) / doPost(e)
  → Router.route(e)
    → Auth.verify(e)          ← проверка Telegram initData
    → EventsController
    → RegistrationsController
    → UsersController
      → Database (те же репозитории)
        → Google Sheets
```

### Endpoints

```
GET  ?action=events                        → список активных событий
GET  ?action=event&id=123                  → детали события
GET  ?action=registrations&userId=456      → мои записи
POST ?action=register                      → записаться на событие
POST ?action=unregister                    → отменить запись
POST ?action=order                         → заявка на мерч
GET  ?action=ticket&token=abc              → валидация QR билета
```

### Формат ответов

```javascript
// Успех
{ ok: true, data: { ... } }

// Ошибка
{ ok: false, error: 'Описание ошибки' }
```

### Аутентификация

Telegram Mini App передаёт `initData` в каждом запросе.
`Auth.js` верифицирует подпись через HMAC-SHA256 с `BOT_TOKEN`.

### Script Properties

| Ключ              | Описание                 |
| ----------------- | ------------------------ |
| `BOT_TOKEN`       | Для верификации initData |
| `SPREADSHEET_ID`  | ID той же Google Таблицы |
| `ALLOWED_ORIGINS` | CORS (url Mini App)      |

---

## ЧАСТЬ 3: MINI APP (`miniapp`)

### Стек

- React 18 + TypeScript
- Vite (сборка)
- CSS Modules
- GitHub Pages (хостинг)

### Навигация

```
Нижняя панель:
  📅 События    👕 Мерч    🎫 Сканер (только ADMIN_IDS)

Внутри Мерч:
  [Каталог]    [Корзина 🔴2]
```

### Определение администратора

```typescript
const ADMIN_IDS = ['1771173222', '1397144271']
const uid = String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '')
const isAdmin = ADMIN_IDS.includes(uid)
```

Вкладка Сканер не рендерится в DOM для обычных пользователей.

### Флоу мерча

```
Каталог → ProductDetail (overlay)
  → выбор цвета → Добавить в корзину
  → подвкладка Корзина
  → Оформить заявку
  → Telegram.WebApp.sendData(JSON) → бот уведомляет менеджера
  (в будущем: POST /api?action=order)
```

### API клиент (`src/api/client.ts`)

```typescript
const API_URL = import.meta.env.VITE_API_URL

async function request<T>(params: Record<string, string>): Promise<T> {
	const tg = window.Telegram?.WebApp
	const url = new URL(API_URL)
	Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

	const res = await fetch(url.toString(), {
		headers: {
			'X-Telegram-Init-Data': tg?.initData || '',
		},
	})

	const data = await res.json()
	if (!data.ok) throw new Error(data.error)
	return data.data
}
```

### Переменные окружения

```
VITE_API_URL=https://script.google.com/macros/s/.../exec   (dev/prod разные)
```

### Товары (захардкожено в `src/data/products.ts`)

```
Футболка Sportiki — 590 000 ₫
  Цвета: Белый, Розовый, Тёмно-синий

Майка Sportiki — 490 000 ₫
  Цвета: Белый, Чёрный
```

---

## ОКРУЖЕНИЯ

### Dev

- Бот: `@sportiki_danaga_test_bot`
- GAS Bot: отдельный скрипт, тестовая таблица
- GAS API: отдельный скрипт, та же тестовая таблица
- Mini App: `http://localhost:5173` (Vite dev server)

### Prod

- Бот: основной бот
- GAS Bot: продакшен скрипт, продакшен таблица
- GAS API: продакшен скрипт, та же продакшен таблица
- Mini App: `https://dmitry-kornienko.github.io/sportiki-merch`

---

## GIT FLOW

```
main          ← продакшен, защищённая ветка
dev           ← интеграция и тестирование
feature/*     ← разработка фич
```

### Рабочий процесс

```bash
# Начало работы над фичей
git checkout dev
git checkout -b feature/events-screen

# Разработка + тест на dev окружении
npm run gas:push:dev     # пушим бот/api в тестовый GAS
npm run miniapp:dev      # запускаем фронт локально

# Готово — мержим в dev
git checkout dev
git merge feature/events-screen
git push origin dev
# → GitHub Actions автоматически пушит в dev GAS

# Выкатка в прод
git checkout main
git merge dev
git push origin main
# → GitHub Actions деплоит бота, API и Mini App
```

---

## КОМАНДЫ (корневой package.json)

```bash
# Mini App
npm run miniapp:dev          # локальный дев сервер
npm run miniapp:build        # сборка для прода

# GAS Bot
npm run bot:deploy:dev       # пуш + деплой в тестовый GAS
npm run bot:deploy:prod      # пуш + деплой в продакшен GAS

# GAS API
npm run api:deploy:dev       # пуш + деплой в тестовый GAS
npm run api:deploy:prod      # пуш + деплой в продакшен GAS
```

---

## ПРИНЦИПЫ РАЗРАБОТКИ

### Общие

- Один файл — одна ответственность
- Именованные константы вместо магических чисел
- Комментарии поясняют ПОЧЕМУ, не ЧТО
- Никаких секретов в коде — только Script Properties и .env

### GAS (бот + API)

- **Repository pattern** — каждый лист Sheets имеет репозиторий
- **Facade pattern** — объект `db` как единая точка входа
- **SOLID** — каждый модуль делает одно
- Никакой бизнес-логики в роутере — только диспетчеризация
- Все тексты в `Texts.js`, все клавиатуры в `Keyboards.js`
- `Database.js` одинаковый в боте и API (или вынести в shared)

### React + TypeScript

- Функциональные компоненты + хуки
- Никаких `any` — типизировать всё
- Кастомные хуки для логики (`useCart`, `useEvents`, `useTelegram`)
- CSS Modules для изоляции стилей
- Mobile-first (Mini App открывается только на телефоне)

---

## ПОЭТАПНЫЙ ПЕРЕХОД БОТ → MINI APP

```
Этап 1 (текущий):
  ✅ Бот — весь функционал
  ✅ Mini App — только мерч

Этап 2:
  → GAS API: events, registrations endpoints
  → Mini App: экран событий + запись

Этап 3:
  → GAS API: все endpoints
  → Mini App: все экраны
  → Бот: только /start + уведомления

Этап 4 (финал):
  → Бот упрощается до минимума
  → Весь UI в Mini App
  → GAS API — единственный бэкенд
```

---

## TODO

- [ ] Настроить clasp для bot и api
- [ ] Создать dev и prod GAS проекты для API
- [ ] Инициализировать Vite + React + TS проект в miniapp/
- [ ] Настроить GitHub Actions для автодеплоя
- [ ] Реализовать GAS API: events endpoint
- [ ] Реализовать экран событий в Mini App
- [ ] Сканер QR — валидация через GAS API
- [ ] QR-билеты — генерация при регистрации
- [ ] Переименовать репозиторий sportiki-merch → sportiki
- [ ] Добавить MERCH_MANAGER_ID в Script Properties (prod)

---

## ССЫЛКИ

|          | Dev                       | Prod                                      |
| -------- | ------------------------- | ----------------------------------------- |
| Бот      | @sportiki_danaga_test_bot | основной бот                              |
| GAS Bot  | dev scriptId              | prod scriptId                             |
| GAS API  | dev scriptId              | prod scriptId                             |
| Mini App | localhost:5173            | dmitry-kornienko.github.io/sportiki-merch |
| Таблица  | dev spreadsheet           | prod spreadsheet                          |
| Канал    | —                         | t.me/INaumkin_coach                       |
