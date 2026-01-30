"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const DRAFTS_KEY = "send-email-drafts";
const LAST_FORM_KEY = "send-email-last-form";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormFields = { to: string; subject: string; html: string };

function loadLastForm(): FormFields {
  if (typeof window === "undefined") return { to: "", subject: "", html: "" };
  try {
    const s = localStorage.getItem(LAST_FORM_KEY);
    if (!s) return { to: "", subject: "", html: "" };
    const d = JSON.parse(s) as unknown;
    if (typeof d !== "object" || d === null) return { to: "", subject: "", html: "" };
    const o = d as Record<string, unknown>;
    return {
      to: typeof o.to === "string" ? o.to : "",
      subject: typeof o.subject === "string" ? o.subject : "",
      html: typeof o.html === "string" ? o.html : "",
    };
  } catch {
    return { to: "", subject: "", html: "" };
  }
}

function saveLastForm(fields: FormFields) {
  try {
    localStorage.setItem(LAST_FORM_KEY, JSON.stringify(fields));
  } catch {
    // ignore
  }
}

type Draft = { id: string; name: string; to: string; subject: string; html: string; updatedAt: number };

function loadDraftsList(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(DRAFTS_KEY);
    if (!s) return [];
    const arr = JSON.parse(s) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
      .map((d) => ({
        id: typeof d.id === "string" ? d.id : crypto.randomUUID(),
        name: typeof d.name === "string" ? d.name : "Без названия",
        to: typeof d.to === "string" ? d.to : "",
        subject: typeof d.subject === "string" ? d.subject : "",
        html: typeof d.html === "string" ? d.html : "",
        updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveDraftsList(list: Draft[]) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

const MIN_LEFT = 280;
const MIN_RIGHT = 320;
const DEFAULT_LEFT_PCT = 0.45;

const PLACEHOLDER_HTML =
  "<p style='padding:1.5rem;color:#6b7280;font-family:system-ui'>Тело письма (HTML или MJML) вводите слева — здесь предпросмотр перед отправкой</p>";

function buildPreviewDoc(html: string, theme: "light" | "dark"): string {
  const bodyContent = html.trim() || PLACEHOLDER_HTML;
  const isDark = theme === "dark";
  const metaColorScheme = isDark
    ? '<meta name="color-scheme" content="dark">'
    : '<meta name="color-scheme" content="light">';
  // Тёмная тема: имитация почтовиков (Gmail, Apple Mail и др.) — инверсия цветов, картинки возвращаем обратно
  const darkStyles = isDark
    ? `<style>
      html{background:#0d0d0d;}
      body{filter:invert(1) hue-rotate(180deg);background:#fff;min-height:100%;color:#000;}
      body img, body video, body svg{filter:invert(1) hue-rotate(180deg);}
    </style>`
    : "";
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">${metaColorScheme}${darkStyles}</head><body>${bodyContent}</body></html>`;
}

export default function SendPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [toTouched, setToTouched] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [leftPct, setLeftPct] = useState(DEFAULT_LEFT_PCT);
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toValid =
    !to || (EMAIL_REGEX.test(to.trim()) && to.indexOf(",") === -1 && !/\s/.test(to));
  const subjectValid = subject.trim().length > 0;
  const htmlValid = html.trim().length > 0;

  // Восстановление полей при загрузке (в следующем тике, чтобы не триггерить линтер)
  useEffect(() => {
    const id = setTimeout(() => {
      const last = loadLastForm();
      setTo(last.to);
      setSubject(last.subject);
      setHtml(last.html);
      setDrafts(loadDraftsList());
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Сохранение полей при изменении (с задержкой для html)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveLastForm({ to, subject, html });
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [to, subject, html]);

  const saveDraft = useCallback(
    (name?: string) => {
      const draftName =
        name?.trim() ||
        `Черновик ${new Date().toLocaleString("ru", { dateStyle: "short", timeStyle: "short" })}`;
      const newDraft: Draft = {
        id: crypto.randomUUID(),
        name: draftName,
        to,
        subject,
        html,
        updatedAt: Date.now(),
      };
      const next = [newDraft, ...drafts].slice(0, 50);
      setDrafts(next);
      saveDraftsList(next);
      setSelectedDraftId(newDraft.id);
      setStatus("idle");
      setMessage("Черновик сохранён");
      setTimeout(() => setMessage(""), 2000);
    },
    [to, subject, html, drafts]
  );

  const updateDraft = useCallback(() => {
    if (!selectedDraftId) return;
    const next = drafts.map((d) =>
      d.id === selectedDraftId
        ? { ...d, to, subject, html, updatedAt: Date.now() }
        : d
    );
    setDrafts(next);
    saveDraftsList(next);
    setMessage("Черновик обновлён");
    setTimeout(() => setMessage(""), 2000);
  }, [selectedDraftId, drafts, to, subject, html]);

  const loadDraft = useCallback((d: Draft) => {
    setTo(d.to);
    setSubject(d.subject);
    setHtml(d.html);
    setSelectedDraftId(d.id);
    setMessage("Черновик загружен");
    setTimeout(() => setMessage(""), 2000);
  }, []);

  const deleteDraft = useCallback(
    (id: string) => {
      const next = drafts.filter((d) => d.id !== id);
      setDrafts(next);
      saveDraftsList(next);
      if (selectedDraftId === id) {
        setSelectedDraftId(null);
      }
      setMessage("Черновик удалён");
      setTimeout(() => setMessage(""), 2000);
    },
    [drafts, selectedDraftId]
  );

  const startResize = useCallback(() => {
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const pct = Math.max(MIN_LEFT / rect.width, Math.min(1 - MIN_RIGHT / rect.width, x));
      setLeftPct(pct);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const toTrim = to.trim();
    const subjectTrim = subject.trim();
    const htmlTrim = html.trim();
    if (!toTrim || !EMAIL_REGEX.test(toTrim) || toTrim.indexOf(",") >= 0) {
      setStatus("error");
      setMessage("Укажите один корректный email в поле To");
      return;
    }
    if (!subjectTrim) {
      setStatus("error");
      setMessage("Укажите Subject");
      return;
    }
    if (!htmlTrim) {
      setStatus("error");
      setMessage("Укажите HTML письма");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to: toTrim, subject: subjectTrim, html: htmlTrim }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setMessage("Письмо отправлено");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Ошибка отправки");
      }
    } catch {
      setStatus("error");
      setMessage("Сетевая ошибка");
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
    >
      {/* Левая панель — редактор */}
      <div
        className="flex flex-col shrink-0 overflow-hidden border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
        style={{ width: `calc(${leftPct * 100}%)` }}
      >
        <header className="shrink-0 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Письмо (HTML для отправки)
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              To, Subject и тело письма — слева. Справа превью.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(status === "success" || status === "error" || message) && (
              <span
                className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${status === "success"
                  ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200"
                  : status === "error"
                    ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
              >
                {message}
              </span>
            )}
            <button
              type="submit"
              form="send-form"
              disabled={status === "sending" || !toValid || !subjectValid || !htmlValid}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 text-sm shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-neutral-50 dark:focus:ring-offset-neutral-900 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none transition-all"
            >
              {status === "sending" ? "Отправка…" : "Отправить письмо"}
            </button>
          </div>
        </header>

        {/* Прокручиваемая область: только To, Subject, HTML */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          <div>
            <label htmlFor="to" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
              To
            </label>
            <input
              id="to"
              type="text"
              inputMode="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onBlur={() => setToTouched(true)}
              placeholder="recipient@example.com"
              className={`w-full rounded-md border px-2.5 py-1.5 text-sm bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500/80 ${toTouched && !toValid
                ? "border-red-500"
                : "border-neutral-300 dark:border-neutral-600"
                }`}
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Тема письма"
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/80"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <label htmlFor="html" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Тело письма (HTML или MJML)
              </label>
              <span className="text-xs text-neutral-500">
                {((html && new TextEncoder().encode(html).length) || 0) / 1024 | 0} KB / 200 KB
              </span>
            </div>
            <textarea
              id="html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<html>...</html> или разметка MJML — это отправится получателю"
              className="flex-1 w-full min-h-[120px] rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2.5 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/80 resize-y"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Нижняя панель: всегда видна */}
        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Черновики:
            </span>
            <select
              aria-label="Выбрать черновик"
              title="Черновик"
              value={selectedDraftId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setSelectedDraftId(null);
                  return;
                }
                const d = drafts.find((x) => x.id === id);
                if (d) loadDraft(d);
              }}
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/80 max-w-[180px]"
            >
              <option value="">— выбрать —</option>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => saveDraft()}
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              Сохранить
            </button>
            {selectedDraftId && (
              <>
                <button
                  type="button"
                  onClick={updateDraft}
                  className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={() => deleteDraft(selectedDraftId)}
                  className="rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Удалить
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Резизер между панелями */}
      <div
        role="separator"
        className="shrink-0 w-1 cursor-col-resize bg-neutral-200 dark:bg-neutral-700 hover:bg-amber-500/50 transition-colors"
        onMouseDown={startResize}
        aria-hidden
      />

      {/* Правая панель — предпросмотр */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-neutral-900"
        style={{ minWidth: MIN_RIGHT }}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Предпросмотр
          </h2>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800">
            <button
              type="button"
              aria-label="Светлая тема в почтовике"
              title="Как в светлой теме"
              onClick={() => setPreviewTheme("light")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${previewTheme === "light"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
              Светлая
            </button>
            <button
              type="button"
              aria-label="Тёмная тема в почтовике"
              title="Как в тёмной теме"
              onClick={() => setPreviewTheme("dark")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${previewTheme === "dark"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
              Тёмная
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4 bg-neutral-100 dark:bg-neutral-950">
          <div
            className={`flex-1 min-h-0 rounded-lg border overflow-hidden shadow-sm ${previewTheme === "dark"
                ? "border-neutral-600 bg-neutral-900"
                : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
              }`}
          >
            <iframe
              title="Предпросмотр письма"
              sandbox=""
              srcDoc={buildPreviewDoc(html, previewTheme)}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>

      <form id="send-form" onSubmit={handleSubmit} className="hidden" />
    </div>
  );
}
