import type { PoolClient } from "pg";
import { AppError } from "../errors";
import { withTransaction } from "../transaction";
import * as cartRepo from "../Repository/cart";
import * as orderRepo from "../Repository/order";
import * as productRepo from "../Repository/product";
import type { CartItemRow, Order } from "../Model/cart";
import type { CheckoutCommand } from "./checkoutCommand";

const round2 = (n: number) => Math.round(n * 100) / 100;

type LockedProduct = { id: number; name: string; price: number; quantity: number };

/**
 * Handler komendy checkout — przebieg procesu biznesowego krok po kroku.
 * Całość w jednej transakcji: błąd w dowolnym kroku = ROLLBACK, nic się nie zapisuje.
 */
export function handleCheckout(command: CheckoutCommand): Promise<Order> {
  return withTransaction(async (db) => {
    const { cartId, items } = await getValidCart(db, command.userId);
    const products = await lockAndCheckStock(db, items);
    const { itemsCount, totalAmount } = calculateTotals(items, products);
    const orderId = await createOrder(db, command.userId, itemsCount, totalAmount);
    await createOrderItems(db, orderId, items, products);
    await decreaseStock(db, items);
    await cartRepo.clearItems(cartId, db);
    return buildOrderResponse(db, orderId, command.userId);
  });
}

/** 1. Pobranie i walidacja koszyka — pustego nie da się zatwierdzić. */
async function getValidCart(db: PoolClient, userId: number) {
  const cart = await cartRepo.getOrCreateCart(userId, db);
  const items = await cartRepo.findItems(cart.id, db);
  if (!items.length) throw new AppError(422, "Nie można złożyć zamówienia z pustym koszykiem");
  return { cartId: cart.id, items };
}

/** 2. Blokada produktów (FOR UPDATE) i ponowne sprawdzenie stanu — mógł się zmienić od dodania do koszyka. */
async function lockAndCheckStock(db: PoolClient, items: CartItemRow[]) {
  const locked = await productRepo.lockForUpdate(items.map((i) => i.product_id), db);
  const products = new Map<number, LockedProduct>(locked.map((p) => [p.id, p]));
  const errors = items
    .filter((i) => i.quantity > (products.get(i.product_id)?.quantity ?? 0))
    .map((i) => `${i.product_name}: w koszyku ${i.quantity}, dostępne ${products.get(i.product_id)?.quantity ?? 0}`);
  if (errors.length) throw new AppError(422, "Niewystarczający stan magazynowy", errors);
  return products;
}

/** 3. Agregacja danych zamówienia (ceny z zablokowanych wierszy = aktualne). */
function calculateTotals(items: CartItemRow[], products: Map<number, LockedProduct>) {
  return {
    itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
    totalAmount: round2(items.reduce((sum, i) => sum + products.get(i.product_id)!.price * i.quantity, 0)),
  };
}

/** 4. Rekord zamówienia + numer ZAM-YYYYMMDD-000001 generowany z id. */
async function createOrder(db: PoolClient, userId: number, itemsCount: number, totalAmount: number) {
  const order = await orderRepo.create(userId, itemsCount, totalAmount, db);
  await orderRepo.setOrderNumber(order.id, generateOrderNumber(order.id, order.created_at), db);
  return order.id;
}

export function generateOrderNumber(orderId: number, date: Date = new Date()) {
  const d = new Date(date);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ZAM-${ymd}-${String(orderId).padStart(6, "0")}`;
}

/** 5. Snapshot pozycji — nazwa i cena z chwili zakupu; późniejsza zmiana produktu nie zmienia zamówienia. */
async function createOrderItems(db: PoolClient, orderId: number, items: CartItemRow[], products: Map<number, LockedProduct>) {
  for (const i of items) {
    const p = products.get(i.product_id)!;
    await orderRepo.addItem(
      orderId,
      { product_id: p.id, product_name: p.name, unit_price: p.price, quantity: i.quantity, line_total: round2(p.price * i.quantity) },
      db
    );
  }
}

/** 6. Zmniejszenie stanu magazynowego o zamówione ilości. */
async function decreaseStock(db: PoolClient, items: CartItemRow[]) {
  for (const i of items) await productRepo.decreaseQuantity(i.product_id, i.quantity, db);
}

async function buildOrderResponse(db: PoolClient, orderId: number, userId: number): Promise<Order> {
  const order = (await orderRepo.findForUser(orderId, userId, db))!;
  return { ...order, items: await orderRepo.findItems(orderId, db) };
}
