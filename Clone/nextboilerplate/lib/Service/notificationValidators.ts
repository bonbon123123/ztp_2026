import { DateTime, IANAZone } from "luxon";
import { NotificationChannel, isChannel } from "../Model/notification";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContent(content: unknown, errors: string[]) {
  if (typeof content !== "string" || !content.trim()) errors.push("content: treść jest wymagana");
}

export function validateChannel(channel: unknown, errors: string[]) {
  if (!isChannel(channel)) errors.push("channel: dozwolone EMAIL lub PUSH");
}

export function validateRecipient(recipient: unknown, channel: unknown, errors: string[]) {
  if (typeof recipient !== "string" || !recipient.trim()) {
    errors.push("recipient: odbiorca jest wymagany");
  } else if (channel === NotificationChannel.EMAIL && !EMAIL_RE.test(recipient.trim())) {
    errors.push("recipient: dla kanału EMAIL wymagany poprawny adres e-mail");
  }
}

/** Zwraca true, jeśli strefa jest poprawna (dopisuje błąd w przeciwnym razie). */
export function validateTimezone(timezone: unknown, errors: string[]): timezone is string {
  if (typeof timezone !== "string" || !timezone.trim()) {
    errors.push("timezone: strefa czasowa jest wymagana");
    return false;
  }
  if (!IANAZone.isValidZone(timezone)) {
    errors.push("timezone: podana strefa czasowa jest nieprawidłowa");
    return false;
  }
  return true;
}

/**
 * Interpretuje scheduled_at w strefie timezone i zwraca moment w UTC.
 * Czas bez offsetu ("2026-12-01T09:00") = czas lokalny w podanej strefie;
 * czas z offsetem/Z ma pierwszeństwo (jak astimezone w Pythonie).
 */
export function convertToUtc(scheduledAt: string, timezone: string): DateTime | null {
  const dt = DateTime.fromISO(scheduledAt, { zone: timezone });
  return dt.isValid ? dt.toUTC() : null;
}

/** Waliduje datę (format + przyszłość) i zwraca ją w UTC. */
export function validateScheduledAt(
  scheduledAt: unknown,
  timezone: string | null,
  errors: string[]
): DateTime | null {
  if (typeof scheduledAt !== "string" || !scheduledAt.trim()) {
    errors.push("scheduled_at: data planowanej wysyłki jest wymagana");
    return null;
  }
  if (!timezone) return null; // bez poprawnej strefy nie da się zinterpretować daty
  const utc = convertToUtc(scheduledAt, timezone);
  if (!utc) {
    errors.push("scheduled_at: nieprawidłowy format daty (ISO 8601)");
    return null;
  }
  if (utc <= DateTime.utc()) {
    errors.push("scheduled_at: planowana data wysyłki musi wskazywać przyszły moment");
    return null;
  }
  return utc;
}
