import { AppError } from "../errors";
import * as cartRepo from "../Repository/cart";
import * as productRepo from "../Repository/product";
import type { Cart, CartItemRow } from "../Model/cart";
import { parsePositiveId, validateQuantity, validateStock } from "./cartValidators";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Agregacja: wartość pozycji, liczba sztuk i suma koszyka liczone na bieżąco (nie zapisywane w bazie). */
export function buildCartResponse(cart: cartRepo.CartRow, rows: CartItemRow[]): Cart {
  const items = rows.map((r) => ({ ...r, line_total: round2(r.unit_price * r.quantity) }));
  return {
    id: cart.id,
    user_id: cart.user_id,
    items,
    items_count: items.reduce((sum, i) => sum + i.quantity, 0),
    total_amount: round2(items.reduce((sum, i) => sum + i.line_total, 0)),
    updated_at: cart.updated_at,
  };
}

function parseItemId(raw: string) {
  const errors: string[] = [];
  const id = parsePositiveId(raw, "item_id", errors);
  if (id === null) throw new AppError(400, "Nieprawidłowe id pozycji");
  return id;
}

export async function getCart(userId: number): Promise<Cart> {
  const cart = await cartRepo.getOrCreateCart(userId);
  return buildCartResponse(cart, await cartRepo.findItems(cart.id));
}

export async function addItem(userId: number, body: any): Promise<Cart> {
  const errors: string[] = [];
  const productId = parsePositiveId(body?.product_id, "product_id", errors);
  const quantity = validateQuantity(body?.quantity, errors);
  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);

  const product = await productRepo.findById(productId!);
  if (!product) throw new AppError(404, "Produkt nie istnieje");

  validateStock(quantity!, product.quantity, product.name, errors);
  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);

  const cart = await cartRepo.getOrCreateCart(userId);
  if (await cartRepo.hasProduct(cart.id, product.id)) {
    throw new AppError(409, "Produkt jest już w koszyku — zmień ilość przez PATCH /cart/items/{item_id}");
  }
  await cartRepo.addItem(cart.id, product.id, quantity!);
  return getCart(userId);
}

export async function updateItem(userId: number, rawItemId: string, body: any): Promise<Cart> {
  const itemId = parseItemId(rawItemId);
  const errors: string[] = [];
  const quantity = validateQuantity(body?.quantity, errors);
  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);

  const cart = await cartRepo.getOrCreateCart(userId);
  const item = await cartRepo.findItem(cart.id, itemId);
  if (!item) throw new AppError(404, "Pozycja nie istnieje w koszyku");

  validateStock(quantity!, item.available_quantity, item.product_name, errors);
  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);

  await cartRepo.updateItemQuantity(cart.id, itemId, quantity!);
  return getCart(userId);
}

export async function removeItem(userId: number, rawItemId: string): Promise<Cart> {
  const itemId = parseItemId(rawItemId);
  const cart = await cartRepo.getOrCreateCart(userId);
  if (!(await cartRepo.removeItem(cart.id, itemId))) throw new AppError(404, "Pozycja nie istnieje w koszyku");
  return getCart(userId);
}
