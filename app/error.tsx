"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h2>
      <p style={{ color: "#64748b", textAlign: "center", marginBottom: "1.5rem", maxWidth: "28rem" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => reset()}
          style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500, background: "#f59e0b", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
        <a
          href="/landing"
          style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500, border: "1px solid #e2e8f0", color: "inherit", textDecoration: "none" }}
        >
          Go home
        </a>
      </div>
    </div>
  )
}
