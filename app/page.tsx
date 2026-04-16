// components/DoorControls.tsx
"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  async function send(doorId: "building" | "apartment") {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: 123, doorId }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 2500);
    }
  }

  return (
    <div
      style={{
        background: "var(--color-background-secondary, #f5f5f5)",
        borderRadius: "20px",
        padding: "2.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary, #999)",
        }}
      >
        apartment · booking 123
      </p>

      <div style={{ display: "flex", gap: "12px" }}>
        <Btn
          onClick={() => send("building")}
          loading={loading}
          variant="primary"
          label="Building"
        />
        <Btn
          onClick={() => send("apartment")}
          loading={loading}
          variant="secondary"
          label="Apartment"
        />
      </div>

      {status && (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color:
              status === "success"
                ? "var(--color-text-success, #16a34a)"
                : "var(--color-text-danger, #dc2626)",
          }}
        >
          {status === "success" ? "✓ Sent successfully" : "✗ Request failed"}
        </p>
      )}
    </div>
  );
}

function Btn({
  onClick,
  loading,
  variant,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  variant: "primary" | "secondary";
  label: string;
}) {
  const isPrimary = variant === "primary";
  const touchHandled = useRef(false);

  const handleClick = () => {
    if (touchHandled.current) {
      touchHandled.current = false;
      return;
    }
    onClick();
  };

  const handleTouchEnd = () => {
    if (loading) return;
    touchHandled.current = true;
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "13px 28px",
        minWidth: "148px",
        fontSize: "14px",
        fontWeight: 500,
        borderRadius: "100px",
        border: isPrimary
          ? "none"
          : "0.5px solid var(--color-border-secondary, #ddd)",
        background: isPrimary
          ? "#111"
          : "var(--color-background-primary, #fff)",
        color: isPrimary ? "#fff" : "var(--color-text-primary, #111)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 0.15s, transform 0.12s",
      }}
      onPointerEnter={(e) => {
        if (!loading) e.currentTarget.style.opacity = "0.8";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.opacity = loading ? "0.6" : "1";
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerDown={(e) => {
        if (!loading) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onPointerCancel={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onTouchStart={(e) => {
        if (!loading) e.currentTarget.style.transform = "scale(0.97)";
      }}
      onTouchCancel={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {loading ? <Spinner light={isPrimary} /> : <Arrow light={isPrimary} />}
      {label}
    </button>
  );
}

function Arrow({ light }: { light: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 7.5h11M8.5 3l4.5 4.5L8.5 12"
        stroke={light ? "#fff" : "currentColor"}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner({ light }: { light: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ flexShrink: 0, animation: "spin 0.75s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle
        cx="7.5"
        cy="7.5"
        r="5.5"
        stroke={light ? "rgba(255,255,255,0.35)" : "currentColor"}
        strokeWidth="1.4"
      />
      <path
        d="M7.5 2a5.5 5.5 0 0 1 5.5 5.5"
        stroke={light ? "#fff" : "currentColor"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
