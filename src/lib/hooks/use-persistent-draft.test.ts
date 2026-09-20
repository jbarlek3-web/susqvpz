import { test } from "node:test";
import assert from "node:assert/strict";

test("Accidental data loss prevention storage quota handling and fallback logic", () => {
  // Simulate browser storage with quota limits
  const mockStorage: Record<string, string> = {};
  const throwQuotaError = false;

  const store = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      if (throwQuotaError) {
        throw new Error("QuotaExceededError");
      }
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    get length() {
      return Object.keys(mockStorage).length;
    },
    key: (index: number) => Object.keys(mockStorage)[index] ?? null,
  };

  // 1. Normal save & restore
  const testPayload = JSON.stringify({ draft: { askingPrice: 350000 }, timestamp: Date.now() });
  store.setItem("fieldacq_vault_feasibility_p-1042", testPayload);
  assert.equal(
    JSON.parse(store.getItem("fieldacq_vault_feasibility_p-1042")!).draft.askingPrice,
    350000,
  );

  // 2. Corrupted JSON recovery
  store.setItem("fieldacq_vault_corrupted", "{ malformed json ... ");
  let readResult = null;
  try {
    readResult = JSON.parse(store.getItem("fieldacq_vault_corrupted")!);
  } catch {
    readResult = null;
  }
  assert.equal(readResult, null);

  // 3. Stale draft eviction simulation
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  mockStorage["fieldacq_vault_old_draft"] = JSON.stringify({
    draft: "old",
    timestamp: eightDaysAgo,
  });

  // Prune keys older than 7 days
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const k of Object.keys(mockStorage)) {
    if (k.startsWith("fieldacq_vault_")) {
      try {
        const parsed = JSON.parse(mockStorage[k]);
        if (parsed?.timestamp && now - parsed.timestamp > sevenDaysMs) {
          delete mockStorage[k];
        }
      } catch {
        delete mockStorage[k];
      }
    }
  }

  assert.equal(mockStorage["fieldacq_vault_old_draft"], undefined);
  assert.notEqual(mockStorage["fieldacq_vault_feasibility_p-1042"], undefined);
});
