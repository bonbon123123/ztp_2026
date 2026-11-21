/** Ilość produktu: liczba całkowita > 0 (odrzuca ujemne, 0, ułamki i napisy). */
export function validateQuantity(raw: unknown, errors: string[]): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
    errors.push("quantity: ilość musi być dodatnią liczbą całkowitą");
    return null;
  }
  return raw;
}

/** Ilość nie może przekraczać stanu magazynowego produktu. */
export function validateStock(quantity: number, available: number, productName: string, errors: string[]) {
  if (quantity > available) {
    errors.push(`quantity: dostępne tylko ${available} szt. produktu ${productName}`);
  }
}

export function parsePositiveId(raw: unknown, field: string, errors: string[]): number | null {
  const id = typeof raw === "string" ? Number(raw) : raw;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    errors.push(`${field}: musi być dodatnią liczbą całkowitą`);
    return null;
  }
  return id;
}
