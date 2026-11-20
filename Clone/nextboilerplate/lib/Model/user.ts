// Moduł identity — użytkownik systemu i jego sesja

/** Rekord z tabeli users (z hashem hasła — tylko do użytku wewnątrz serwisu). */
export type UserRow = {
  id: number;
  email: string;
  password_hash: string; // "salt$hash" (PBKDF2-SHA256)
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
};

/** Użytkownik zwracany przez API — bez password_hash. */
export type User = Omit<UserRow, "password_hash">;

export type UserInput = {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
};

/** Rekord z tabeli user_sessions. */
export type UserSession = {
  id: number;
  user_id: number;
  session_token: string; // wartość cookie auth_token
  created_at: Date;
  last_used_at: Date; // przesuwane przy aktywności (sliding session)
};

export const toUser = ({ password_hash: _hash, ...user }: UserRow): User => user;
