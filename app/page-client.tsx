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
  checkInTime?: string;
  checkOutTime?: string;
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

  return (
    <>
      {state.kind === "loading" && <Loading />}
      {state.kind === "no_booking_id" && (
        <BookingIdForm onSubmit={handleSubmit} />
      )}
      {state.kind === "result" &&
        (() => {
          switch (state.data.status) {
            case "not_found":
              return (
                <BookingIdForm onSubmit={handleSubmit} error="Booking not found" />
              );
            case "not_started":
              return (
                <BookingNotStarted
                  fromDate={state.data.fromDate!}
                  checkInTime={state.data.checkInTime!}
                />
              );
            case "expired":
              return <BookingExpired />;
            case "valid":
              return <DoorControls bookingId={state.data.bookingId} />;
          }
        })()}
    </>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <svg
        width="32"
        height="32"
        viewBox="0 0 15 15"
        fill="none"
        className="animate-spin"
      >
        <circle
          cx="7.5"
          cy="7.5"
          r="5.5"
          stroke="var(--spinner-accent)"
          strokeWidth="1.4"
          opacity="0.3"
        />
        <path
          d="M7.5 2a5.5 5.5 0 0 1 5.5 5.5"
          stroke="var(--spinner-accent)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <p className="m-0 text-sm text-content-secondary">
        Enter your booking ID to continue
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. abc123"
          className="px-4 py-2.5 w-[200px] text-sm outline-none bg-input-bg text-foreground border-[0.5px] border-border-default rounded-(--radius-input) placeholder:text-content-tertiary"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-5 py-2.5 rounded-(--radius-btn) border-none bg-btn-primary-bg text-btn-primary-text text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-opacity"
        >
          Go
        </button>
      </form>
      {error && (
        <p className="m-0 text-[13px] text-content-danger">{error}</p>
      )}
    </div>
  );
}

function BookingNotStarted({ fromDate, checkInTime }: { fromDate: string; checkInTime: string }) {
  const date = new Date(fromDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = new Date(`1970-01-01T${checkInTime}`).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-2 px-4">
      <p className="m-0 text-[15px] text-content-secondary">
        Your booking window hasn&apos;t started yet.
      </p>
      <p className="m-0 text-[13px] text-content-tertiary">
        Check back on {date} at {time}.
      </p>
    </div>
  );
}

function BookingExpired() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-2 px-4">
      <p className="m-0 text-[15px] text-content-secondary">
        Thank you for staying with us!
      </p>
      <p className="m-0 text-[13px] text-content-tertiary">
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
      className="bg-card rounded-(--radius-card) p-10 flex flex-col items-center gap-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="m-0 text-[11px] tracking-[0.08em] uppercase text-content-tertiary">
        apartment &middot; booking {bookingId}
      </p>

      <div className="flex gap-3">
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
          className={`m-0 text-[13px] ${
            status === "success" ? "text-content-success" : "text-content-danger"
          }`}
        >
          {status === "success" ? "Sent successfully" : "Request failed"}
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
  const btnRef = useRef<HTMLButtonElement>(null);

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

  const applyHover = (active: boolean) => {
    if (!btnRef.current || loading) return;
    btnRef.current.style.opacity = active
      ? "var(--btn-hover-opacity)"
      : loading ? "0.6" : "1";
  };

  const applyPress = (pressed: boolean) => {
    if (!btnRef.current || loading) return;
    btnRef.current.style.transform = pressed
      ? "scale(var(--btn-press-scale))"
      : "scale(1)";
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      disabled={loading}
      className={`
        flex items-center justify-center gap-2
        px-7 py-3 min-w-[148px]
        text-sm font-medium
        rounded-(--radius-btn)
        transition-[opacity,transform] duration-150
        disabled:cursor-not-allowed disabled:opacity-60
        ${
          isPrimary
            ? "border-none bg-btn-primary-bg text-btn-primary-text"
            : "bg-btn-secondary-bg text-btn-secondary-text border-[0.5px] border-btn-secondary-border"
        }
      `}
      onPointerEnter={() => applyHover(true)}
      onPointerLeave={() => {
        applyHover(false);
        applyPress(false);
      }}
      onPointerDown={() => applyPress(true)}
      onPointerUp={() => applyPress(false)}
      onPointerCancel={() => applyPress(false)}
      onTouchStart={() => applyPress(true)}
      onTouchCancel={() => applyPress(false)}
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
      className="shrink-0"
    >
      <path
        d="M2 7.5h11M8.5 3l4.5 4.5L8.5 12"
        stroke={light ? "var(--btn-primary-text)" : "var(--text-primary)"}
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
      className="shrink-0 animate-spin"
    >
      <circle
        cx="7.5"
        cy="7.5"
        r="5.5"
        stroke={light ? "rgba(255,255,255,0.35)" : "var(--spinner-accent)"}
        strokeWidth="1.4"
      />
      <path
        d="M7.5 2a5.5 5.5 0 0 1 5.5 5.5"
        stroke={light ? "var(--btn-primary-text)" : "var(--spinner-accent)"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
