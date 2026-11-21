// Command Pattern (uproszczony): obiekt opisujący ZAMIAR wykonania checkoutu — same dane, bez logiki.
// Wykonaniem zajmuje się handler (checkoutHandler.ts).
export type CheckoutCommand = {
  readonly userId: number; // zalogowany użytkownik (z sesji), nie z body żądania
};

export const createCheckoutCommand = (userId: number): CheckoutCommand => ({ userId });
