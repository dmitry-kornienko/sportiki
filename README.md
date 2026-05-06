# Sportiki

Монорепо проекта Sportiki — Telegram Mini App + бот для экспат-комьюнити Da Nang.

## Быстрый старт

### 1. Установить зависимости

```bash
# Clasp для GAS
cd gas/bot && npm install
cd ../api && npm install

# Mini App
cd ../../miniapp && npm install
```

### 2. Авторизовать clasp

```bash
clasp login
```

### 3. Заполнить scriptId

Открыть `gas/bot/.clasp.dev.json` и `gas/bot/.clasp.prod.json`,
вставить scriptId из GAS проектов.

То же самое для `gas/api/`.

### 4. Настроить Mini App

```bash
cd miniapp
cp .env.example .env.local
# вставить URL GAS API в .env.local
```

### 5. Запуск

```bash
# Из корня:
npm run miniapp:dev        # фронт локально
npm run bot:push:dev       # пушим бот в тест
npm run api:push:dev       # пушим API в тест
```

## GitHub Actions секреты

Добавить в Settings → Secrets:

| Секрет | Описание |
|---|---|
| `CLASP_CREDENTIALS` | Содержимое `~/.clasprc.json` после `clasp login` |
| `VITE_API_URL_PROD` | URL продакшен GAS API |

## Структура

Подробно в [CLAUDE.md](./CLAUDE.md).
