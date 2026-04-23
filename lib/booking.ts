import { db } from "./db";
import { bookings } from "./db/schema";
import { eq } from "drizzle-orm";

export type BookingStatus =
  | "valid"
  | "not_started"
  | "expired"
  | "not_found";

export interface BookingResult {
  status: BookingStatus;
  bookingId: string;
  fromDate?: string;
  toDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

/** Get the last Sunday of a given month (1-indexed). */
function lastSundayOfMonth(year: number, month: number): number {
  const lastDay = new Date(year, month, 0).getDate();
  const dayOfWeek = new Date(year, month - 1, lastDay).getDay(); // 0 = Sunday
  return lastDay - dayOfWeek;
}

/** Whether a given date string falls within CEST (summer time). */
function isCEST(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const marSun = lastSundayOfMonth(y, 3);
  const octSun = lastSundayOfMonth(y, 10);
  if (m < 3 || (m === 3 && d < marSun)) return false;
  if (m > 10 || (m === 10 && d > octSun)) return false;
  return true;
}

/** Parse a DATE + TIME into an absolute UTC Date, accounting for CET/CEST. */
function parseCet(dateStr: string, timeStr: string): Date {
  const offset = isCEST(dateStr) ? "+02:00" : "+01:00";
  return new Date(`${dateStr}T${timeStr}${offset}`);
}

export async function validateBooking(
  bookingId: string,
): Promise<BookingResult> {
  console.log("[validateBooking] looking up bookingId:", bookingId);

  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  const row = result[0] ?? null;

  if (!row) {
    console.log("[validateBooking] no row found for bookingId:", bookingId);
    return { status: "not_found", bookingId };
  }

  console.log("[validateBooking] found row:", row);

  if (!row.checkInTime || !row.checkOutTime) {
    console.log("[validateBooking] missing checkInTime or checkOutTime for bookingId:", bookingId);
    return { status: "not_found", bookingId };
  }

  const now = new Date();
  const checkIn = parseCet(row.fromDate, row.checkInTime);
  const checkOut = parseCet(row.toDate, row.checkOutTime);

  console.log(
    "[validateBooking] now:",
    now.toISOString(),
    "checkIn:",
    checkIn.toISOString(),
    "checkOut:",
    checkOut.toISOString(),
  );

  if (now < checkIn) {
    console.log("[validateBooking] status: not_started");
    return {
      status: "not_started",
      bookingId: row.id,
      fromDate: row.fromDate,
      toDate: row.toDate,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
    };
  }

  if (now > checkOut) {
    console.log("[validateBooking] status: expired");
    return {
      status: "expired",
      bookingId: row.id,
      fromDate: row.fromDate,
      toDate: row.toDate,
      checkInTime: row.checkInTime,
      checkOutTime: row.checkOutTime,
    };
  }

  console.log("[validateBooking] status: valid");
  return {
    status: "valid",
    bookingId: row.id,
    fromDate: row.fromDate,
    toDate: row.toDate,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
  };
}
