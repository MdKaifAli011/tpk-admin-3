export const HOURS_PER_DAY_STORAGE_KEY = "examPrep_hoursPerDay";
export const ACCURACY_STORAGE_KEY = "examPrep_accuracyPct";

export function getStoredHoursPerDay() {
  if (typeof window === "undefined") return 3;
  try {
    const v = parseInt(localStorage.getItem(HOURS_PER_DAY_STORAGE_KEY), 10);
    return Number.isNaN(v) || v < 1 || v > 24 ? 3 : v;
  } catch {
    return 3;
  }
}

export function setStoredHoursPerDay(n) {
  try {
    localStorage.setItem(HOURS_PER_DAY_STORAGE_KEY, String(n));
  } catch {}
}

export function getStoredAccuracy() {
  if (typeof window === "undefined") return 100;
  try {
    const v = parseInt(localStorage.getItem(ACCURACY_STORAGE_KEY), 10);
    return Number.isNaN(v) || v < 0 || v > 100 ? 100 : v;
  } catch {
    return 100;
  }
}

export function setStoredAccuracy(n) {
  try {
    localStorage.setItem(ACCURACY_STORAGE_KEY, String(n));
  } catch {}
}

/** Suggested hrs/day from accuracy % (same logic as dashboard). */
export function getSuggestedHoursFromAccuracy(pct) {
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));
  return Math.min(24, Math.max(1, Math.round(2 + (safe / 100) * 8)));
}

/** Accuracy % that would suggest this many hrs/day (inverse of above). Used to move slider when user changes hrs/day. */
export function getAccuracyFromHours(hours) {
  const h = Number(hours);
  if (Number.isNaN(h) || h <= 2) return 0;
  if (h >= 10) return 100;
  return Math.min(100, Math.max(0, Math.round(((h - 2) / 8) * 100)));
}

const EXAM_PREP_CHANNEL = "examPrep_sync_channel";

/** Broadcast hours/accuracy so other components (e.g. on VPS) can sync without relying on React state. */
export function broadcastExamPrepSync(hoursPerDay, accuracyPct) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("examPrep_sync", { detail: { hoursPerDay, accuracyPct } })
    );
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(EXAM_PREP_CHANNEL);
      ch.postMessage({ hoursPerDay, accuracyPct });
      ch.close();
    }
  } catch (_) {}
}

/** Subscribe to exam prep sync (BroadcastChannel + custom event). Returns unsubscribe. */
export function subscribeExamPrepSync(callback) {
  if (typeof window === "undefined") return () => {};
  const onMessage = (e) => {
    const d = (e && (e.detail ?? e.data ?? e)) || {};
    if (d.hoursPerDay != null || d.accuracyPct != null) callback(d);
  };
  const onCustom = (e) => onMessage(e);
  window.addEventListener("examPrep_sync", onCustom);
  let channel;
  try {
    channel = new BroadcastChannel(EXAM_PREP_CHANNEL);
    channel.onmessage = (ev) => onMessage(ev.data != null ? ev.data : ev);
  } catch (_) {}
  return () => {
    window.removeEventListener("examPrep_sync", onCustom);
    try {
      if (channel) channel.close();
    } catch (_) {}
  };
}
