import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 py-16 px-8">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Send Email (MVP)
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-center">
          Тестовая отправка HTML-писем с Gmail. Один получатель за раз.
        </p>
        <Link
          href="/send"
          className="rounded-full bg-black dark:bg-zinc-100 text-white dark:text-black px-6 py-3 font-medium hover:opacity-90"
        >
          Открыть /send
        </Link>
      </main>
    </div>
  );
}
