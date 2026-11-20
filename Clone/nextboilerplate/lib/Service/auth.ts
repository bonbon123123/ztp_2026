import { randomBytes } from "crypto";
import { AppError } from "../errors";
import * as userRepo from "../Repository/user";
import * as sessionRepo from "../Repository/userSession";
import { User, toUser } from "../Model/user";
import { hashPassword, verifyPassword } from "./passwordHasher";
import {
  validateEmail,
  validateName,
  validatePasswordConfirmation,
  validatePasswordStrength,
} from "./authValidators";

/** Sesja wygasa po 30 min BRAKU aktywności (sliding session); ta sama wartość to max-age cookie. */
export const SESSION_MAX_AGE_SECONDS = 1800;
export const AUTH_COOKIE = "auth_token";

export const generateSessionToken = () => randomBytes(32).toString("base64url");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function isSessionExpired(lastUsedAt: Date, now = new Date()) {
  return now.getTime() - new Date(lastUsedAt).getTime() > SESSION_MAX_AGE_SECONDS * 1000;
}

export async function register(body: any): Promise<User> {
  const errors: string[] = [];
  validateEmail(body?.email, errors);
  validatePasswordStrength(body?.password, errors);
  validatePasswordConfirmation(body?.password, body?.confirm_password, errors);
  validateName(body?.first_name, "first_name", "imię", errors);
  validateName(body?.last_name, "last_name", "nazwisko", errors);
  if (errors.length) throw new AppError(422, "Błąd walidacji", errors);

  const email = normalizeEmail(body.email);
  if (await userRepo.findByEmail(email)) {
    throw new AppError(409, "Konto z takim adresem e-mail już istnieje");
  }

  const row = await userRepo.create({
    email,
    password_hash: hashPassword(body.password),
    first_name: body.first_name.trim(),
    last_name: body.last_name.trim(),
  });
  return toUser(row);
}

/** Logowanie: weryfikacja hasła → nowa sesja w bazie; zwraca użytkownika i token do cookie. */
export async function login(body: any): Promise<{ user: User; token: string }> {
  if (typeof body?.email !== "string" || typeof body?.password !== "string") {
    throw new AppError(422, "Błąd walidacji", ["email i password są wymagane"]);
  }
  const row = await userRepo.findByEmail(normalizeEmail(body.email));
  // ten sam komunikat dla złego e-maila i złego hasła — nie zdradzamy, które konta istnieją
  if (!row || !verifyPassword(body.password, row.password_hash)) {
    throw new AppError(401, "Niepoprawny e-mail lub hasło");
  }
  if (!row.is_active) throw new AppError(403, "Konto użytkownika jest nieaktywne");

  const token = generateSessionToken();
  await sessionRepo.create(row.id, token, new Date());
  return { user: toUser(row), token };
}

/**
 * Użytkownik przypisany do sesji (do reużycia przez kolejne moduły, np. koszyk).
 * Wygasła / osierocona sesja jest usuwana z bazy; poprawna — przedłużana (last_used_at = teraz).
 */
export async function getCurrentUser(token: string | null | undefined): Promise<User> {
  if (!token) throw new AppError(401, "Brak aktywnej sesji");
  const session = await sessionRepo.findByToken(token);
  if (!session) throw new AppError(401, "Brak aktywnej sesji");

  const now = new Date();
  if (isSessionExpired(session.last_used_at, now)) {
    await sessionRepo.deleteById(session.id);
    throw new AppError(401, "Sesja wygasła");
  }

  const row = await userRepo.findById(session.user_id);
  if (!row || !row.is_active) {
    await sessionRepo.deleteById(session.id);
    throw new AppError(401, row ? "Konto użytkownika jest nieaktywne" : "Użytkownik sesji nie istnieje");
  }

  await sessionRepo.touch(session.id, now);
  return toUser(row);
}

export async function logout(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  return sessionRepo.deleteByToken(token);
}
