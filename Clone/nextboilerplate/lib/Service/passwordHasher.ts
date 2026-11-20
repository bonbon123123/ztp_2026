import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

// PBKDF2 (KDF z biblioteki standardowej) — celowo wolne liczenie skrótu utrudnia brute-force
export const PBKDF2_ITERATIONS = 100_000;
export const SALT_BYTES = 16;
const KEY_LENGTH = 32; // długość skrótu SHA-256 w bajtach
const DIGEST = "sha256";

function derive(password: string, salt: string) {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
}

/** Zwraca "salt$hash" — losowy salt sprawia, że to samo hasło daje za każdym razem inny wynik. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  return `${salt}$${derive(password, salt).toString("hex")}`;
}

/** Ponownie liczy skrót z zapisanym saltem i porównuje w czasie stałym (odporność na timing attack). */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split("$", 2);
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = derive(password, salt);
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
