// src/storage/localStorage.ts
import { StorageKey } from "./storageKeys";

/**
 * Safely parse JSON from localStorage.
 */
function safeParse<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Get raw string from localStorage.
 */
export function getRaw(key: StorageKey): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

/**
 * Set raw string to localStorage.
 */
export function setRaw(key: StorageKey, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

/**
 * Remove key from localStorage.
 */
export function remove(key: StorageKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

/**
 * Read JSON value from localStorage, or fallback if not present / invalid.
 */
export function getJSON<T>(key: StorageKey, fallback: T): T {
  const raw = getRaw(key);
  return safeParse<T>(raw, fallback);
}

/**
 * Save JSON value to localStorage.
 */
export function setJSON<T>(key: StorageKey, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Optional: clear all keys for this app only (not entire localStorage).
 */
export function clearAllAppData(): void {
  if (typeof window === "undefined") return;
  Object.values(StorageKey).forEach((k) =>
    window.localStorage.removeItem(k)
  );
}