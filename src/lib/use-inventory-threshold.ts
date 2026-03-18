import { useState, useEffect } from "react";

export type InventoryThreshold = { low: number; high: number };

const KEY = "minori_inventory_threshold";
export const DEFAULT_THRESHOLD: InventoryThreshold = { low: 10, high: 100 };

export function readThreshold(): InventoryThreshold {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_THRESHOLD;
    const parsed = JSON.parse(raw) as Partial<InventoryThreshold>;
    const low = Number(parsed.low);
    const high = Number(parsed.high);
    if (!isNaN(low) && !isNaN(high) && low >= 0 && high > low) {
      return { low, high };
    }
    return DEFAULT_THRESHOLD;
  } catch {
    return DEFAULT_THRESHOLD;
  }
}

export function writeThreshold(t: InventoryThreshold) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch { /* noop */ }
}

export function useInventoryThreshold(): InventoryThreshold {
  const [threshold, setThreshold] = useState<InventoryThreshold>(DEFAULT_THRESHOLD);
  useEffect(() => {
    setThreshold(readThreshold());
  }, []);
  return threshold;
}
