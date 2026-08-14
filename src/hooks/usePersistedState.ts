import { useEffect, useState } from "react";

/**
 * useState backed by localStorage — the same load/save-on-change
 * pattern taskData.ts/projectData.ts hand-roll per domain (loadX()
 * read once into useState, useEffect writes on every change), just
 * generalized so per-project stores (files, discussions) don't need
 * their own load/save pair each.
 *
 * `initialValue` only runs (lazily) the first time a given `key` has
 * nothing stored yet, so it's the right place to seed demo content.
 */
export function usePersistedState<T>(key: string, initialValue: T | (() => T)) {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch (error) {
      console.error(`Failed to load "${key}" from localStorage:`, error);
    }
    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Failed to save "${key}" to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState] as const;
}
