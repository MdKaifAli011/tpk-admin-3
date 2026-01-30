// ============================================
// Production Logger Utility
// ============================================
// Use LOG_LEVEL=error|warn|info|debug (default: production=info, development=debug).
// Logs to console; in production use JSON lines for log aggregators (Vercel, etc.).

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const isDev = process.env.NODE_ENV === "development";
const rawLevel = (process.env.LOG_LEVEL || "").toLowerCase();
const levelIndex = LEVELS[rawLevel] ?? (isDev ? 3 : 1); // dev=debug, prod=info

const shouldLog = (level) => LEVELS[level] <= levelIndex;

/** Normalize (message, ...args) into (message, data) for format */
function normalizeData(args) {
  if (args.length === 0) return undefined;
  if (args.length === 1) {
    const v = args[0];
    if (v != null && typeof v === "object" && !(v instanceof Error)) return v;
    return { extra: v };
  }
  return { extra: args };
}

/** In production, JSON line for aggregators; in dev human-readable */
function format(level, message, data) {
  const ts = new Date().toISOString();
  if (isDev) {
    const prefix = `[${ts}] [${level.toUpperCase()}]`;
    return data !== undefined ? [prefix, message, data] : [prefix, message];
  }
  const payload = { ts, level, message, ...(data && typeof data === "object" ? data : { extra: data }) };
  return [JSON.stringify(payload)];
}

function log(level, message, ...args) {
  const data = normalizeData(args);
  const out = format(level, message, data);
  if (level === "error") console.error(...out);
  else if (level === "warn") console.warn(...out);
  else console.log(...out);
}

export const logger = {
  error(message, ...args) {
    if (!shouldLog("error")) return;
    log("error", message, ...args);
  },

  warn(message, ...args) {
    if (!shouldLog("warn")) return;
    log("warn", message, ...args);
  },

  info(message, ...args) {
    if (!shouldLog("info")) return;
    log("info", message, ...args);
  },

  debug(message, ...args) {
    if (!shouldLog("debug")) return;
    log("debug", message, ...args);
  },
};
