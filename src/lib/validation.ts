import { z } from "zod";

const HTML_MAX_BYTES = 200 * 1024; // 200KB

const emailSchema = z
  .string()
  .min(1, "Email обязателен")
  .email("Некорректный email")
  .refine(
    (v) => !/\s/.test(v) && v.indexOf(",") === -1,
    "Только один адрес, без пробелов и запятых"
  );

export const sendEmailBodySchema = z.object({
  to: emailSchema,
  subject: z
    .string()
    .min(1, "Subject обязателен")
    .max(998, "Subject слишком длинный"),
  html: z
    .string()
    .min(1, "HTML body обязателен")
    .refine(
      (s) => new TextEncoder().encode(s).length <= HTML_MAX_BYTES,
      `HTML не более ${HTML_MAX_BYTES / 1024}KB`
    ),
});

export type SendEmailBody = z.infer<typeof sendEmailBodySchema>;

export const HTML_MAX_SIZE = HTML_MAX_BYTES;
