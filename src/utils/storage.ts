/**
 * Safe LocalStorage JSON parser to prevent Root Layout crashes and SSR hydration errors.
 * Ignores empty string, 'undefined', 'null' strings or broken JSON.
 */
export const safeGetJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null' || item.trim() === '') return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return fallback;
  }
};

export const safeSetJSON = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
};
