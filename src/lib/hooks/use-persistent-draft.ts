import { useEffect, useRef, useState, useCallback } from "react";

export interface PersistentDraftOptions<T> {
  enableBeforeUnloadWarn?: boolean;
  storage?: "localStorage" | "sessionStorage";
  debounceMs?: number;
  isEqual?: (a: T, b: T) => boolean;
}

export interface PersistentDraftResult<T> {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  isDirty: boolean;
  isDraftRestored: boolean;
  lastSavedAt: number | null;
  clearDraft: () => void;
  resetToDefault: () => void;
  saveImmediately: () => void;
}

// In-memory fallback vault when browser storage is unavailable or quota is exceeded
const memoryVault = new Map<string, string>();

/**
 * Safely accesses storage with Safari private mode and permission error guards.
 */
function getStorage(type: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const store = window[type];
    const testKey = "__fieldacq_test__";
    store.setItem(testKey, "1");
    store.removeItem(testKey);
    return store;
  } catch {
    // Fallback between localStorage and sessionStorage
    if (type === "localStorage") {
      try {
        const fallback = window.sessionStorage;
        const testKey = "__fieldacq_test__";
        fallback.setItem(testKey, "1");
        fallback.removeItem(testKey);
        return fallback;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Prunes stale drafts older than 7 days when storage quota is pressured.
 */
function pruneStaleDrafts(store: Storage) {
  try {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith("fieldacq_vault_")) {
        const item = store.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            if (parsed?.timestamp && now - parsed.timestamp > sevenDaysMs) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }
    for (const k of keysToRemove) {
      store.removeItem(k);
    }
  } catch {
    // Best-effort cleanup
  }
}

/**
 * usePersistentDraft - Enterprise Accidental Data Loss Prevention Hook
 *
 * Automatically captures user form/tool inputs into browser storage,
 * flushes uncommitted writes on unmount/navigation, warns before accidental
 * window unload, handles storage quota pressure, and synchronizes across tabs.
 */
export function usePersistentDraft<T>(
  key: string,
  initialValue: T | (() => T),
  options: PersistentDraftOptions<T> = {},
): PersistentDraftResult<T> {
  const {
    enableBeforeUnloadWarn = true,
    storage = "localStorage",
    debounceMs = 300,
    isEqual = (a: T, b: T) => JSON.stringify(a) === JSON.stringify(b),
  } = options;

  const storagePrefix = "fieldacq_vault_";
  const storageKey = `${storagePrefix}${key}`;

  const resolvedInitial = useRef<T>(
    typeof initialValue === "function" ? (initialValue as () => T)() : initialValue,
  );

  const readCachedDraft = useCallback((): { draft: T; timestamp: number | null } | null => {
    const store = getStorage(storage);
    let raw: string | null = null;
    if (store) {
      try {
        raw = store.getItem(storageKey);
      } catch {
        raw = null;
      }
    }
    if (!raw) {
      raw = memoryVault.get(storageKey) ?? null;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "draft" in parsed) {
          return { draft: parsed.draft as T, timestamp: parsed.timestamp ?? null };
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [storage, storageKey]);

  const [value, setValue] = useState<T>(() => {
    const cached = readCachedDraft();
    return cached ? cached.draft : resolvedInitial.current;
  });

  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(() => {
    const cached = readCachedDraft();
    return Boolean(cached && !isEqual(cached.draft, resolvedInitial.current));
  });

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    const cached = readCachedDraft();
    return cached?.timestamp ?? null;
  });

  const isDirty = !isEqual(value, resolvedInitial.current);

  // Keep refs for unmount and beforeunload flushes
  const valueRef = useRef(value);
  valueRef.current = value;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const currentKeyRef = useRef(storageKey);

  // Save execution helper with quota error recovery
  const persistToStore = useCallback(
    (currentVal: T) => {
      const isInitial = isEqual(currentVal, resolvedInitial.current);
      const store = getStorage(storage);

      if (isInitial) {
        if (store) {
          try {
            store.removeItem(storageKey);
          } catch {
            // Ignore removal errors
          }
        }
        memoryVault.delete(storageKey);
        setLastSavedAt(null);
        return;
      }

      const now = Date.now();
      const payload = JSON.stringify({ draft: currentVal, timestamp: now });

      if (store) {
        try {
          store.setItem(storageKey, payload);
        } catch {
          // Quota exceeded: prune stale drafts and retry
          pruneStaleDrafts(store);
          try {
            store.setItem(storageKey, payload);
          } catch {
            // Store fallback will use memoryVault
          }
        }
      }

      // If store failed or wasn't available, save in memoryVault
      memoryVault.set(storageKey, payload);
      setLastSavedAt(now);
    },
    [storage, storageKey, isEqual],
  );

  // Dynamic key change detection (e.g., when parcelId changes)
  useEffect(() => {
    if (currentKeyRef.current !== storageKey) {
      currentKeyRef.current = storageKey;
      const cached = readCachedDraft();
      if (cached) {
        setValue(cached.draft);
        setIsDraftRestored(!isEqual(cached.draft, resolvedInitial.current));
        setLastSavedAt(cached.timestamp);
      } else {
        setValue(resolvedInitial.current);
        setIsDraftRestored(false);
        setLastSavedAt(null);
      }
    }
  }, [storageKey, readCachedDraft, isEqual]);

  // Debounced auto-save with unmount flush
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistToStore(value);
      saveTimeoutRef.current = null;
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        // CRITICAL DATA LOSS PREVENTION: Flush dirty value immediately on unmount/navigation
        persistToStore(valueRef.current);
      }
    };
  }, [value, debounceMs, persistToStore]);

  // Window beforeunload prompt and emergency write flush
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        persistToStore(valueRef.current);
      }

      if (enableBeforeUnloadWarn && isDirtyRef.current) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes in your workspace. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enableBeforeUnloadWarn, persistToStore]);

  // Multi-tab synchronization
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && typeof parsed === "object" && "draft" in parsed) {
              setLastSavedAt(parsed.timestamp ?? null);
            }
          } catch {
            // Ignore malformed storage events from external tabs
          }
        } else {
          setLastSavedAt(null);
          setIsDraftRestored(false);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    const store = getStorage(storage);
    if (store) {
      try {
        store.removeItem(storageKey);
      } catch {
        // Ignore store removal failure
      }
    }
    memoryVault.delete(storageKey);
    setIsDraftRestored(false);
    setLastSavedAt(null);
  }, [storage, storageKey]);

  const resetToDefault = useCallback(() => {
    clearDraft();
    setValue(resolvedInitial.current);
  }, [clearDraft]);

  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    persistToStore(valueRef.current);
  }, [persistToStore]);

  return {
    value,
    setValue,
    isDirty,
    isDraftRestored,
    lastSavedAt,
    clearDraft,
    resetToDefault,
    saveImmediately,
  };
}
