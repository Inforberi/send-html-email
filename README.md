# Send Email (MVP)

Next.js (App Router, TypeScript) — тестовая отправка HTML-писем с Gmail. Один получатель за раз, защита токеном, rate limit, черновики в localStorage.

- **UI:** `/send` — To, Subject, HTML body, preview (sandbox iframe), Send, сохранение/загрузка черновика.
- **API:** `POST /api/send-email` — JSON `{ to, subject, html }`, ответ `{ ok }` или `{ ok, error, code }`.
- **Отправка:** Nodemailer + Gmail SMTP (App Password). Секреты в `.env.local`.

Подробно: настройка Gmail, переменные, чек-лист тестов, типовые ошибки — **[docs/SETUP.md](docs/SETUP.md)**.

## Запуск

Скопируй `env.example` в `.env.local`, заполни `GMAIL_USER`, `GMAIL_APP_PASSWORD`, при необходимости `SEND_ACCESS_TOKEN` (см. [docs/SETUP.md](docs/SETUP.md)).

```bash
pnpm install
pnpm dev
```

Открой [http://localhost:3000](http://localhost:3000) → ссылка «Открыть /send» или сразу [http://localhost:3000/send](http://localhost:3000/send).

Деплой: Vercel или любой Node-хостинг; задать те же переменные окружения.
