import { randomBytes } from "crypto";
import { AppError } from "../errors";
import * as repo from "../Repository/notification";
import * as productRepo from "../Repository/product";
import { NotificationInput, NotificationStatus, isStatus } from "../Model/notification";
import { canTransition } from "./notificationStateMachine";
import { dispatchNotification } from "./notificationDispatcher";
import {
  validateChannel,
  validateContent,
  validateRecipient,
  validateScheduledAt,
  validateTimezone,
} from "./notificationValidators";

/** Identyfikator operacji generowany po stronie serwera (odpowiednik secrets.token_urlsafe(24)). */
export function generateIdempotencyKey() {
  return `notif_${randomBytes(24).toString("base64url")}`;
}

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Nieprawidłowe id");
  return id;
}

async function validate(body: any): Promise<NotificationInput> {
  const errors: string[] = [];
  validateContent(body?.content, errors);
  validateChannel(body?.channel, errors);
  validateRecipient(body?.recipient, body?.channel, errors);
  const tzOk = validateTimezone(body?.timezone, errors);
  const scheduledUtc = validateScheduledAt(body?.scheduled_at, tzOk ? body.timezone : null, errors);

  let productId: number | null = null;
  const rawProduct = body?.product_id;
  if (rawProduct !== undefined && rawProduct !== null && rawProduct !== "") {
    productId = Number(rawProduct);
    if (!Number.isInteger(productId) || productId <= 0) {
      errors.push("product_id: musi być dodatnią liczbą całkowitą");
    } else if (!(await productRepo.findById(productId))) {
      errors.push("product_id: produkt nie istnieje");
    }
  }

  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);
  return {
    content: body.content.trim(),
    channel: body.channel,
    recipient: body.recipient.trim(),
    scheduled_at: scheduledUtc!.toJSDate(),
    timezone: body.timezone,
    product_id: productId,
    idempotency_key: generateIdempotencyKey(),
  };
}

export const list = () => repo.findAll();

export async function get(rawId: string) {
  const n = await repo.findById(parseId(rawId));
  if (!n) throw new AppError(404, "Powiadomienie nie zostało znalezione");
  return n;
}

export async function create(body: unknown) {
  return repo.create(await validate(body));
}

export async function updateStatus(rawId: string, body: any) {
  const id = parseId(rawId);
  const newStatus = body?.status;
  if (!isStatus(newStatus)) {
    throw new AppError(422, "Błąd walidacji", ["status: dozwolone PENDING, SENT, FAILED, CANCELLED"]);
  }
  const current = await repo.findById(id);
  if (!current) throw new AppError(404, "Powiadomienie nie zostało znalezione");
  if (!canTransition(current.status, newStatus as NotificationStatus)) {
    throw new AppError(422, `Przejście ze statusu ${current.status} do ${newStatus} jest niedozwolone.`);
  }
  return repo.updateStatus(id, newStatus);
}

/** Realizacja pojedynczego powiadomienia: dispatch → SENT, błąd wysyłki → FAILED. */
export async function executeNotification(id: number) {
  const n = await repo.findById(id);
  if (!n) throw new AppError(404, "Powiadomienie nie zostało znalezione");
  if (n.status !== NotificationStatus.PENDING) {
    throw new AppError(422, "Wykonać można wyłącznie powiadomienie w statusie PENDING.");
  }

  let result: NotificationStatus = NotificationStatus.SENT;
  try {
    await dispatchNotification(n);
  } catch (e) {
    console.error(`[DELIVERY] Powiadomienie #${id} nieudane: ${e}`);
    result = NotificationStatus.FAILED;
  }

  const saved = await repo.setStatusIfPending(id, result);
  if (!saved) throw new AppError(422, "Status powiadomienia zmienił się w trakcie wysyłki.");
  return saved;
}

export async function sendNow(rawId: string) {
  return executeNotification(parseId(rawId));
}

/** Przetwarzanie wsadowe wszystkich gotowych powiadomień; zwraca ich liczbę. */
export async function processReadyNotifications() {
  const ready = await repo.findReady();
  for (const n of ready) {
    try {
      await executeNotification(n.id);
    } catch (e) {
      console.error(`[WORKER] Pominięto #${n.id}: ${e}`);
    }
  }
  return ready.length;
}
