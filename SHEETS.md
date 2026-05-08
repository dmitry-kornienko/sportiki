# Google Sheets — Схема данных

## Events (13 колонок)

| # | Колонка | Тип | Примечание |
|---|---------|-----|------------|
| 1 | ID | string | Автоинкремент (Unix timestamp) |
| 2 | Type | string | Эмодзи + тип, напр. "⚽ Футбол" |
| 3 | Title | string | Название события |
| 4 | Date | string ДД.ММ.ГГГГ | "15.06.2025" |
| 5 | Time | string ЧЧ:ММ | "18:00" |
| 6 | MaxPeople | number | 0 = без лимита |
| 7 | Info | string | Описание события |
| 8 | Status | string | `Registration_Open` / `Registration_Closed` / `Archived` |
| 9 | Location | string | Место проведения |
| 10 | ReminderSent | string | **Бот-only** — управляется Reminders.js, API не читает |
| 11 | ReserveLimit | number | 0 = нет резерва; игнорируется если MaxPeople=0 |
| 12 | Price | number | 0 = бесплатно; в VND |
| 13 | PaymentInfo | string | JSON с реквизитами оплаты |

## Registrations (9 колонок)

| # | Колонка | Тип | Примечание |
|---|---------|-----|------------|
| 1 | ChatID | string | Telegram user ID |
| 2 | EventID | string | Ссылка на Events.ID |
| 3 | Name | string | Имя участника |
| 4 | RegDate | string | Дата регистрации |
| 5 | Status | string | `MAIN` / `RESERVE` |
| 6 | Username | string | "@username" или "" |
| 7 | TgName | string | first_name из Telegram |
| 8 | IsGuest | string | `YES` / `NO` |
| 9 | Confirmation | string | Статус подтверждения оплаты |

Гостевая запись связана с основной по ChatID + EventID.
Один пользователь — не более одного гостя на событие.

## Users (5 колонок)

| # | Колонка | Тип |
|---|---------|-----|
| 1 | ChatID | string |
| 2 | Username | string |
| 3 | FirstName | string |
| 4 | CreatedAt | string |
| 5 | LastSeen | string |

## States (только бот, 3 колонки)

| # | Колонка | Тип |
|---|---------|-----|
| 1 | ChatID | string |
| 2 | State | string |
| 3 | TempData | string (JSON) |
