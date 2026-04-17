import { getSupabaseClient } from "./supabase";

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
}

export async function validateBooking(
  bookingId: string,
): Promise<BookingResult> {
  const supabase = getSupabaseClient();

  type BookingRow = { id: string; from_date: string; to_date: string };
  console.log("[validateBooking] looking up bookingId:", bookingId);

  const { data, error } = (await supabase
    .from("bookings")
    .select("id, from_date, to_date")
    .eq("id", bookingId)
    .maybeSingle()) as { data: BookingRow | null; error: { message: string } | null };

  if (error) {
    console.error("[validateBooking] Supabase error:", error);
    return { status: "not_found", bookingId };
  }

  if (!data) {
    console.log("[validateBooking] no row found for bookingId:", bookingId);
    return { status: "not_found", bookingId };
  }

  console.log("[validateBooking] found row:", data);

  const now = new Date();
  const fromDate = new Date(data.from_date);
  const toDate = new Date(data.to_date);

  console.log("[validateBooking] now:", now.toISOString(), "from:", fromDate.toISOString(), "to:", toDate.toISOString());

  if (now < fromDate) {
    console.log("[validateBooking] status: not_started");
    return {
      status: "not_started",
      bookingId: data.id,
      fromDate: data.from_date,
      toDate: data.to_date,
    };
  }

  if (now > toDate) {
    console.log("[validateBooking] status: expired");
    return {
      status: "expired",
      bookingId: data.id,
      fromDate: data.from_date,
      toDate: data.to_date,
    };
  }

  console.log("[validateBooking] status: valid");
  return {
    status: "valid",
    bookingId: data.id,
    fromDate: data.from_date,
    toDate: data.to_date,
  };
}
