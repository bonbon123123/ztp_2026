import nodemailer from "nodemailer";
import type { Notification } from "../Model/notification";

// Adresy czytane przy każdym wywołaniu (można nadpisać zmiennymi środowiskowymi)
const smtpHost = () => process.env.SMTP_HOST ?? "localhost";
const smtpPort = () => Number(process.env.SMTP_PORT ?? 1025);
const ntfyUrl = () => process.env.NTFY_URL ?? "http://localhost:8088";

/** EMAIL: wysyłka przez lokalny SMTP MailHoga. */
export async function sendEmailNotification(n: Notification): Promise<void> {
  const transport = nodemailer.createTransport({
    host: smtpHost(),
    port: smtpPort(),
    secure: false,
    connectionTimeout: 5000,
  });
  await transport.sendMail({
    from: "noreply@ztp.local",
    to: n.recipient,
    subject: "Notification",
    text: n.content,
  });
}

/** PUSH: POST treści na topic ntfy (recipient = nazwa topicu). */
export async function sendPushNotification(n: Notification): Promise<void> {
  const res = await fetch(`${ntfyUrl()}/${n.recipient}`, {
    method: "POST",
    body: n.content,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`ntfy odpowiedział ${res.status}`);
}
