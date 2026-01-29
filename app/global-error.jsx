"use client";

import React from "react";

const isChunkLoadError = (err) =>
  err?.message?.includes("Failed to load chunk") ||
  err?.message?.includes("ChunkLoadError") ||
  err?.name === "ChunkLoadError";

export default function GlobalError({ error, reset }) {
  const chunkError = isChunkLoadError(error);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f4f6", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 8 }}>
            {chunkError ? "Page needs a refresh" : "Something went wrong"}
          </h1>
          <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 24, lineHeight: 1.5 }}>
            {chunkError
              ? "A script failed to load (often after a new deploy or dev server restart). Refreshing the page usually fixes it."
              : error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => (chunkError ? window.location.reload() : reset())}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#2563eb",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {chunkError ? "Refresh page" : "Try again"}
          </button>
        </div>
      </body>
    </html>
  );
}
