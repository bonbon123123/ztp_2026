// Moduł cart — koszyk użytkownika i zamówienia

/** Pozycja koszyka z bieżącymi danymi produktu (cena i stan z tabeli products). */
export type CartItemRow = {
  item_id: number;
  product_id: number;
  product_name: string;
  unit_price: number; // cena bieżąca
  quantity: number;
  available_quantity: number; // stan magazynu
};

export type CartItem = CartItemRow & { line_total: number };

/** Odpowiedź GET /cart — agregaty liczone w serwisie, nie zapisywane w bazie. */
export type Cart = {
  id: number;
  user_id: number;
  items: CartItem[];
  items_count: number;
  total_amount: number;
  updated_at: string;
};

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string; // snapshot
  unit_price: number; // snapshot ceny z chwili checkoutu
  quantity: number;
  line_total: number;
};

export type OrderSummary = {
  id: number;
  order_number: string;
  status: string;
  items_count: number;
  total_amount: number;
  created_at: string;
};

export type Order = OrderSummary & { user_id: number; items: OrderItem[] };
