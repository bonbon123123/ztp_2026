import { AppError } from "../errors";
import * as orderRepo from "../Repository/order";
import type { Order } from "../Model/cart";
import { parsePositiveId } from "./cartValidators";

export const listOrders = (userId: number) => orderRepo.findByUser(userId);

/** Szczegóły zamówienia z pozycjami; cudze zamówienie traktujemy jak nieistniejące (404). */
export async function getOrder(userId: number, rawId: string): Promise<Order> {
  const id = parsePositiveId(rawId, "order_id", []);
  if (id === null) throw new AppError(400, "Nieprawidłowe id zamówienia");
  const order = await orderRepo.findForUser(id, userId);
  if (!order) throw new AppError(404, "Zamówienie nie istnieje");
  return { ...order, items: await orderRepo.findItems(id) };
}
