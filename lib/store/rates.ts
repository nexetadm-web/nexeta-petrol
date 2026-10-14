/**
 * Rates Storage & Persistence Manager - Nexeta Petrol
 * Persists fuel rates across navigation and page loads using localStorage + DB sync.
 * Storage key format: `petrol_rates_YYYY-MM-DD`
 */

export interface StoredRateData {
  petrol_rate: number;
  diesel_rate: number;
  hioctane_rate: number;
  super_rate?: number;
  date: string;
  updated_at?: string;
  pump_id?: number;
}

/**
 * Returns standard YYYY-MM-DD key for today or given date
 */
export function getRateStorageKey(dateStr?: string): string {
  if (dateStr) {
    // If format is DD-MM-YYYY, convert to YYYY-MM-DD
    const dmRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateStr.match(dmRegex);
    if (match) {
      return `petrol_rates_${match[3]}-${match[2]}-${match[1]}`;
    }
    // If already YYYY-MM-DD
    const ymRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (ymRegex.test(dateStr)) {
      return `petrol_rates_${dateStr}`;
    }
  }

  // Fallback to today's date in YYYY-MM-DD
  try {
    const today = new Date().toISOString().split("T")[0];
    return `petrol_rates_${today}`;
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `petrol_rates_${y}-${m}-${d}`;
  }
}

/**
 * Retrieve rate from browser localStorage
 */
export function getSavedRateLocal(dateStr?: string): StoredRateData | null {
  if (typeof window === "undefined") return null;

  try {
    const key = getRateStorageKey(dateStr);
    const item = window.localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (
        parsed &&
        (parsed.petrol_rate != null || parsed.petrol != null) &&
        (parsed.diesel_rate != null || parsed.diesel != null)
      ) {
        return {
          petrol_rate: Number(parsed.petrol_rate ?? parsed.petrol),
          diesel_rate: Number(parsed.diesel_rate ?? parsed.diesel),
          hioctane_rate: Number(parsed.hioctane_rate ?? parsed.hioctane ?? parsed.super_rate ?? 0),
          super_rate: Number(parsed.super_rate ?? parsed.hioctane_rate ?? 0),
          date: parsed.date || key.replace("petrol_rates_", ""),
          updated_at: parsed.updated_at || new Date().toISOString(),
          pump_id: parsed.pump_id,
        };
      }
    }

    // Secondary check: look for any petrol_rates_* key from today
    const today = new Date().toISOString().split("T")[0];
    const todayKey = `petrol_rates_${today}`;
    if (key !== todayKey) {
      const fallbackItem = window.localStorage.getItem(todayKey);
      if (fallbackItem) {
        return JSON.parse(fallbackItem);
      }
    }
  } catch (err) {
    console.warn("Failed to read rate from localStorage:", err);
  }

  return null;
}

/**
 * Save rate into browser localStorage with timestamp
 */
export function saveRateLocal(rateData: Partial<StoredRateData>, dateStr?: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = getRateStorageKey(dateStr || rateData.date);
    const existing = getSavedRateLocal(dateStr);

    const payload: StoredRateData = {
      petrol_rate: Number(rateData.petrol_rate ?? existing?.petrol_rate ?? 0),
      diesel_rate: Number(rateData.diesel_rate ?? existing?.diesel_rate ?? 0),
      hioctane_rate: Number(rateData.hioctane_rate ?? existing?.hioctane_rate ?? 0),
      super_rate: Number(rateData.super_rate ?? rateData.hioctane_rate ?? existing?.super_rate ?? 0),
      date: rateData.date || key.replace("petrol_rates_", ""),
      updated_at: rateData.updated_at || new Date().toISOString(),
      pump_id: rateData.pump_id ?? existing?.pump_id,
    };

    window.localStorage.setItem(key, JSON.stringify(payload));

    // Also dispatch custom window event so all open tabs or sibling components immediately update
    window.dispatchEvent(new CustomEvent("nexeta_rates_updated", { detail: payload }));
  } catch (err) {
    console.warn("Failed to save rate to localStorage:", err);
  }
}

/**
 * Format timestamp into readable Urdu/English string:
 * e.g. "Aakhri update: 14 Oct 2026, 10:30 AM"
 */
export function formatLastUpdatedText(dateOrTimestamp?: string | Date | null): string {
  if (!dateOrTimestamp) {
    const now = new Date();
    return formatDateTime(now);
  }

  try {
    const d = typeof dateOrTimestamp === "string" ? new Date(dateOrTimestamp) : dateOrTimestamp;
    if (isNaN(d.getTime())) {
      return String(dateOrTimestamp);
    }
    return formatDateTime(d);
  } catch {
    return String(dateOrTimestamp);
  }
}

function formatDateTime(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}
