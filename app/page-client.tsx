"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type BookingStatus =
  | "valid"
  | "not_started"
  | "expired"
  | "not_found";

interface BookingResult {
  status: BookingStatus;
  bookingId: string;
  fromDate?: string;
  toDate?: string;
}

type ViewState =
  | { kind: "loading" }
  | { kind: "no_booking_id" }
  | { kind: "result"; data: BookingResult };

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export default function HomeClient({
  bookingId,
}: {
  bookingId: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ViewState>(
    bookingId ? { kind: "loading" } : { kind: "no_booking_id" },
  );

  useEffect(() => {
    if (!bookingId) return;
    let active = true;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/booking?bookingId=${encodeURIComponent(bookingId)}`,
        );
        const data = await res.json();
        if (active) setState({ kind: "result", data });
      } catch {
        if (active) setState({ kind: "no_booking_id" });
      }
    };

    const timeout = setTimeout(check, 0);
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [bookingId]);

  const handleSubmit = (id: string) => {
    router.push(`/?bookingId=${encodeURIComponent(id)}`);
  };

  if (state.kind === "loading") {
    return <Loading />;
  }

  if (state.kind === "no_booking_id") {
    return <BookingIdForm onSubmit={handleSubmit} />;
  }

  switch (state.data.status) {
    case "not_found":
      return (
        <BookingIdForm onSubmit={handleSubmit} error="Booking not found" />
      );
    case "not_started":
      return <BookingNotStarted fromDate={state.data.fromDate!} />;
    case "expired":
      return <BookingExpired />;
    case "valid":
      return <DoorControls bookingId={state.data.bookingId} />;
  }
}

function Loading() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <Spinner light={false} />
    </div>
  );
}

function BookingIdForm({
  onSubmit,
  error,
}: {
  onSubmit: (id: string) => void;
  error?: string;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "1rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          color: "var(--color-text-secondary, #666)",
        }}
      >
        Enter your booking ID to continue
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. abc123"
          style={{
            padding: "10px 16px",
            borderRadius: "100px",
            border: "0.5px solid var(--color-border-secondary, #ddd)",
            fontSize: "14px",
            outline: "none",
            width: "200px",
            background: "var(--color-background-primary, #fff)",
            color: "var(--color-text-primary, #111)",
          }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          style={{
            padding: "10px 20px",
            borderRadius: "100px",
            border: "none",
            background: "#111",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            cursor: value.trim() ? "pointer" : "not-allowed",
            opacity: value.trim() ? 1 : 0.6,
          }}
        >
          Go
        </button>
      </form>
      {error && (
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--color-text-danger, #dc2626)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function BookingNotStarted({ fromDate }: { fromDate: string }) {
  const date = new Date(fromDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "0.5rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "15px",
          color: "var(--color-text-secondary, #666)",
        }}
      >
        Your booking window hasn&apos;t started yet.
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "var(--color-text-tertiary, #999)",
        }}
      >
        Check back on {date}.
      </p>
    </div>
  );
}

function BookingExpired() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: "0.5rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "15px",
          color: "var(--color-text-secondary, #666)",
        }}
      >
        Thank you for staying with us!
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "var(--color-text-tertiary, #999)",
        }}
      >
        Your booking has ended.
      </p>
    </div>
  );
}

function DoorControls({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  async function send(doorId: "building" | "apartment") {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, doorId }),
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
        apartment &middot; booking {bookingId}
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
          {status === "success"
            ? "Sent successfully"
            : "Request failed"}
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
