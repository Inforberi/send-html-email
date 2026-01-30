# Настройка и запуск Send Email (MVP)

## 1. Структура проекта

```
src/
  app/
    send/
      page.tsx       # UI: To, Subject, HTML, Preview, Send, черновики
      login/
        page.tsx     # Ввод токена доступа
    api/
      send-email/
        route.ts     # POST /api/send-email
      auth/
        route.ts     # POST /api/auth (установка cookie)
    layout.tsx
    page.tsx
  lib/
    validation.ts   # zod-схема + лимиты
    mailer.ts        # Nodemailer → Gmail SMTP
    rate-limit.ts    # in-memory rate limit
  middleware.ts     # защита /send и /api/send-email
env.example         # шаблон переменных (скопировать в .env.local)
```

## 2. Выбор способа отправки и почему

**Реализован: Nodemailer + Gmail SMTP с App Password.**

- **Надёжность:** стандартный SMTP, Gmail не меняет схему для App Password.
- **Безопасность:** не храним пароль аккаунта, только App Password (можно отозвать в Google без смены пароля).
- **Простота:** один раз включил 2FA, создал App Password, положил в `.env.local` — без OAuth flow и refresh token.
- **Деплой:** те же переменные окружения на Vercel/другом хосте.

**Альтернативы (кратко):**

1. **OAuth2 + Nodemailer** — один раз получить refresh token (OAuth Playground или скрипт), в env: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. Плюс: нет пароля в env. Минус: настройка OAuth в Google Cloud.
2. **Gmail API (googleapis)** — официальный API, OAuth2, больше контроля (черновики, метки). Минус: больше кода и настройки.
3. **SendGrid/Mailgun** — если позже нужна рассылка и отчётность; для одного отправителя Gmail достаточно.

## 3. Пошаговая настройка Gmail (App Password)

1. **Включи 2-Step Verification**
   - https://myaccount.google.com/security  
   - «Signing in to Google» → «2-Step Verification» → включить.

2. **Создать App Password**
   - На той же странице безопасности: «App passwords» (появится после 2FA).
   - App: «Mail», Device: «Other» → ввести имя (например `Send Email MVP`).
   - Скопировать 16-символьный пароль (формат `xxxx xxxx xxxx xxxx`; в `.env` можно без пробелов).

3. **Переменные окружения**
   - Скопировать `env.example` в `.env.local`.
   - Заполнить:
     - `GMAIL_USER=tatarchuk.a.s.1997@gmail.com`
     - `GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx` (16 символов без пробелов).
     - `SEND_ACCESS_TOKEN=любой-секретный-токен` — для доступа к `/send` и API (в dev можно не задавать — защита отключена).

4. **Проверка**
   - `pnpm dev`, открыть `/send`, ввести токен (если задан), заполнить To/Subject/HTML и нажать Send.
   - Письмо должно прийти от `tatarchuk.a.s.1997@gmail.com` с корректным HTML.

## 4. Команды

```bash
# установка
pnpm install

# разработка
pnpm dev

# сборка и запуск
pnpm build
pnpm start
```

## 5. Чек-лист тестирования (минимум 5 кейсов)

1. **Успешная отправка** — валидный To, непустой Subject и HTML → письмо приходит, ответ `{ ok: true }`.
2. **Валидация To** — пустой email / некорректный формат / два адреса через запятую → 400, понятное сообщение об ошибке.
3. **Валидация Subject/HTML** — пустые поля → 400.
4. **Лимит размера HTML** — тело > 200KB → 400 с сообщением про лимит.
5. **Доступ и rate limit** — без токена редирект на `/send/login`; с токеном после 10+ запросов в минуту → 429.

Дополнительно: preview в iframe (sandbox без скриптов), сохранение/загрузка черновика в localStorage.

## 6. Типовые ошибки Gmail и что делать

| Ошибка / код | Причина | Решение |
|--------------|--------|--------|
| **Invalid login** / AUTH_FAILED | Неверный логин или пароль | Проверить `GMAIL_USER` и `GMAIL_APP_PASSWORD` (именно App Password, не пароль от аккаунта). Убедиться, что 2FA включена и пароль скопирован без пробелов. |
| **invalid_grant** | Истёк/отозван refresh token (при OAuth) или неверный App Password | Для App Password: создать новый в Google Account → App passwords и обновить `.env.local`. |
| **Rate limit** / RATE_LIMIT_GMAIL | Превышен лимит Gmail (например 500/день для бесплатного аккаунта) | Подождать или уменьшить частоту отправки. Для рассылок позже — очередь + задержки или другой провайдер. |
| **Connection refused** / CONNECTION_ERROR | Файрвол или сеть блокирует порт 465 | Проверить порт 465 outbound; на некоторых хостингах нужен SMTP relay вместо прямого Gmail. |
| **Self signed certificate** | Локально: строгая проверка SSL | В dev для Nodemailer можно временно `secure: false` только для отладки; в проде оставить `secure: true`. |

Логи: в проде не логируем полный HTML; в коде при ошибке пишем только `code` и короткое сообщение (см. `mapErrorCode` в `app/api/send-email/route.ts`).
