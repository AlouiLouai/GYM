"use client";

// Last-resort boundary for errors in the root layout itself, so it must render its own <html>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 24, margin: 0 }}>Something went wrong</h1>
        <button
          type="button"
          onClick={reset}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "12px 32px",
            fontWeight: 600,
            background: "#a3e635",
            color: "#09090b",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
