export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

const USER_KEY = 'user';
const LEGACY_TOKEN_KEY = 'token';

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function readLegacySession() {
  if (typeof window === 'undefined') {
    return { rawUser: null };
  }

  return {
    rawUser: window.localStorage.getItem(USER_KEY),
  };
}

export function loadSession() {
  const storage = getStorage();
  if (!storage) {
    return { user: null };
  }

  let rawUser = storage.getItem(USER_KEY);

  if (!rawUser) {
    const legacySession = readLegacySession();
    if (legacySession.rawUser) {
      storage.setItem(USER_KEY, legacySession.rawUser);
      window.localStorage.removeItem(USER_KEY);
      rawUser = legacySession.rawUser;
    }
  }

  if (!rawUser) {
    return { user: null };
  }

  try {
    return {
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    clearSession();
    return { user: null };
  }
}

export function saveSession(user: AuthUser) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(USER_KEY);
  }

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}