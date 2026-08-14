import { Compass } from "lucide-react";
import { Link } from "react-router-dom";


export default function NotFound() {
  return (
    <div
      className="bg-card border-soft fade-in flex flex-col items-center"
      style={{ borderRadius: 22, padding: "80px 24px", textAlign: "center", gap: 10 }}
    >
      <div
        className="bg-surface-2"
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Compass size={22} strokeWidth={1.7} color="var(--text-2)" />
      </div>

      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Page not found</p>
      <p className="text-ink-3" style={{ fontSize: 12.5, maxWidth: 300 }}>
        The page you're looking for doesn't exist or may have moved.
      </p>

      <Link
        to="/"
        style={{
          marginTop: 6,
          background: "var(--text)",
          color: "var(--surface)",
          border: "none",
          borderRadius: 12,
          padding: "9px 16px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
