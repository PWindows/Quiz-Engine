const COOKIE = 'pwindows_session';
const MAX_AGE = 60 * 60 * 4;

export function saveSession({ playerId, code, name, game }) {
  const v = encodeURIComponent(JSON.stringify({ playerId, code, name, game }));
  document.cookie = `${COOKIE}=${v}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function loadSession() {
  const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
  if (!match) return null;
  try { return JSON.parse(decodeURIComponent(match[1])); } catch { return null; }
}

export function clearSession() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function makePlayerId() {
  return crypto.randomUUID();
}