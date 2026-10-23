import { AppError } from "../errors";
import * as repo from "../Repository/product"
import { findCategory, isForbidden } from "../Repository/category"
import * as historyRepo from "../Repository/history";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Nieprawidłowe id");
  return id;
}

async function validate(body: any, excludeId?: number): Promise<repo.ProductInput> {
  const errors: string[] = [];
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const price = Number(body?.price);
  const quantity = Number(body?.quantity);
  const categoryId = Number(body?.category_id);

  if (!/^[\p{L}\p{N}]{3,20}$/u.test(name)) {
    errors.push("name: 3–20 znaków, tylko litery i cyfry");
  } else {
    if (await isForbidden(name)) errors.push("name: nazwa jest zakazana");
    if (await repo.nameTaken(name, excludeId)) errors.push("name: nazwa już istnieje");
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    errors.push("quantity: liczba całkowita ≥ 0");
  }

  const category = Number.isInteger(categoryId) ? await findCategory(categoryId) : undefined;
  if (!category) errors.push("category_id: kategoria nie istnieje");

  if (!Number.isFinite(price)) {
    errors.push("price: musi być liczbą");
  } else if (category && (price < category.min_price || price > category.max_price)) {
    errors.push(`price: dla kategorii ${category.name} dozwolone ${category.min_price}–${category.max_price}`);
  }

  if (errors.length) throw new AppError(400, "Błąd walidacji", errors);
  return { name, price, quantity, category_id: categoryId };
}

export const list = () => repo.findAll();

export async function get(rawId: string) {
  const product = await repo.findById(parseId(rawId));
  if (!product) throw new AppError(404, "Produkt nie istnieje");
  return product;
}

export async function create(body: unknown) {
  return repo.create(await validate(body));
}

export async function update(rawId: string, body: unknown) {
  const id = parseId(rawId);
  if (!(await repo.findById(id))) throw new AppError(404, "Produkt nie istnieje");
  return repo.update(id, await validate(body, id));
}

export async function remove(rawId: string) {
  const id = parseId(rawId);
  if (!(await repo.remove(id))) throw new AppError(404, "Produkt nie istnieje");
  return { deleted: id };
}

export async function patch(rawId: string, body: unknown) {
  const id = parseId(rawId);
  const current = await repo.findById(id);
  if (!current) throw new AppError(404, "Produkt nie istnieje");

  const changes = body && typeof body === "object" ? body : {};
  const merged = {
    name: current.name,
    price: current.price,
    quantity: current.quantity,
    category_id: current.category_id,
    ...changes,
  };
  return repo.update(id, await validate(merged, id));
}

export async function getHistory(rawId: string) {
  const id = parseId(rawId);
  const entries = await historyRepo.findByProductId(id);
  if (entries.length === 0) throw new AppError(404, "Brak historii dla tego produktu");
  return entries;
}