/**
 * Single source of truth for how BrowserOS authenticates against the backend.
 *
 * Three call sites previously each hardcoded the storage key and the header
 * scheme, and all three were wrong: they sent `Authorization: Token <…>` read
 * from an `authToken` key. The backend accepts only SimpleJWT (`Bearer`) or
 * `X-API-Key` (see `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`), and nothing
 * in this app ever wrote `authToken` — so every authenticated request was in
 * fact anonymous.
 *
 * The key below matches what the workflow frontend's login writes, so the two
 * apps share a session when served from the same origin.
 */

const ACCESS_TOKEN_KEY = 'access_token';

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    // Storage blocked (private mode) — fall back to cookie auth.
    return null;
  }
}

/** Authorization header for the current session, or `{}` when signed out. */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
