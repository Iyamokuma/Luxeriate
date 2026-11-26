"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Georgia, serif", background: "#faf6ef", color: "#1e1a16", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
          <p style={{ color: "#6d645a" }}>Your payments and records are safe. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 12, border: 0, background: "#014e22", color: "#fffdf9", fontSize: 15, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
