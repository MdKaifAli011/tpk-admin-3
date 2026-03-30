/**
 * Server-side Google reCAPTCHA v2 checkbox verification.
 * Uses RECAPTCHA_SECRET_KEY from the environment.
 */

/** True for localhost-style hosts (reCAPTCHA site keys usually block these). */
export function isLocalhostHostHeader(hostHeader) {
  const host = (hostHeader || "").trim();
  if (!host) return false;
  let hostname = host.split(":")[0].toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

/**
 * Skip verification when running `next dev` or when the request host is
 * localhost (Google site keys often disallow localhost).
 */
export function shouldBypassRecaptchaForRequest(request) {
  if (process.env.NODE_ENV === "development") return true;
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded || request.headers.get("host") || "";
  return isLocalhostHostHeader(host);
}

export async function verifyRecaptchaV2(token, remoteip) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return { ok: true, skipped: true };
  }

  const trimmed = typeof token === "string" ? token.trim() : "";
  if (!trimmed) {
    return {
      ok: false,
      message: "reCAPTCHA verification is required",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (remoteip) {
    body.set("remoteip", String(remoteip).trim());
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));

  if (!data.success) {
    if (process.env.NODE_ENV === "development" && Array.isArray(data["error-codes"])) {
      console.warn("[recaptcha] siteverify failed:", data["error-codes"].join(", "));
    }
    return {
      ok: false,
      message: "reCAPTCHA verification failed. Please try again.",
    };
  }

  return { ok: true };
}
