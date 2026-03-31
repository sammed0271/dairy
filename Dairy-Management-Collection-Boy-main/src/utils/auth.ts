import type { AuthUser } from "../types/auth";

const TOKEN_KEY = "token";
const USER_KEY = "authUser";
const AUTH_EVENT = "auth-changed";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const setSession = (token: string, user: AuthUser) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const updateStoredUser = (user: AuthUser) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
};

export const AUTH_CHANGED_EVENT = AUTH_EVENT;
