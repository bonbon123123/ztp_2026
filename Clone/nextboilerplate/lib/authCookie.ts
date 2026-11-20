import { NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_MAX_AGE_SECONDS } from "./Service/auth";

// Warstwa web modułu identity: odczyt i zapis cookie auth_token
const COOKIE_OPTIONS = {
  httpOnly: true, // niedostępne z JavaScriptu (document.cookie)
  sameSite: "lax" as const, // nie wysyłane przy żądaniach cross-site typu POST z obcej strony
  secure: false, // lokalnie HTTP; w produkcji (HTTPS) powinno być true
  path: "/",
};

/** Token z nagłówka Cookie — działa dla Request i NextRequest (testy wołają handlery zwykłym Request). */
export function readAuthToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === AUTH_COOKIE) return decodeURIComponent(rest.join("=")) || null;
  }
  return null;
}

/** Ustawia (lub odświeża) cookie — max-age liczony od teraz, więc każde użycie przedłuża jego życie. */
export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_SECONDS });
  return res;
}

/** Usuwa cookie po stronie klienta (max-age=0). */
export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
