"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "2rem", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h2>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>{error.message || "An unexpected error occurred."}</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500, background: "#f59e0b", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", fontWeight: 500, border: "1px solid #e2e8f0", color: "inherit", textDecoration: "none" }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
