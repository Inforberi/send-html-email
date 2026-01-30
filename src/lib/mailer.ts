import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Transporter } from "nodemailer";
import type { SendEmailBody } from "./validation";

const user = process.env.GMAIL_USER ?? "";
const pass = process.env.GMAIL_APP_PASSWORD ?? "";

const baseTls: SMTPTransport.Options["tls"] = {
  servername: "smtp.gmail.com",
  minVersion: "TLSv1.2",
};

const baseTimeouts: Pick<
  SMTPTransport.Options,
  "connectionTimeout" | "greetingTimeout" | "socketTimeout"
> = {
  connectionTimeout: 25_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
};

const create465 = (): Transporter<SMTPTransport.SentMessageInfo> => {
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not set");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: baseTls,
    ...baseTimeouts,
  });
};

const create587 = (): Transporter<SMTPTransport.SentMessageInfo> => {
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD not set");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    tls: baseTls,
    ...baseTimeouts,
  });
};

let t465: Transporter<SMTPTransport.SentMessageInfo> | null = null;
let t587: Transporter<SMTPTransport.SentMessageInfo> | null = null;

const get465 = (): Transporter<SMTPTransport.SentMessageInfo> => (t465 ??= create465());
const get587 = (): Transporter<SMTPTransport.SentMessageInfo> => (t587 ??= create587());

const sendWith = async (
  t: Transporter<SMTPTransport.SentMessageInfo>,
  payload: SendEmailBody
): Promise<void> => {
  await t.sendMail({
    from: user,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
};

export const sendEmail = async (payload: SendEmailBody): Promise<void> => {
  try {
    await sendWith(get465(), payload);
    return;
  } catch {
    // 465 может падать из-за локальной TLS-инспекции/антивируса/перехвата
  }
  await sendWith(get587(), payload);
};