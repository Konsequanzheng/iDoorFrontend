import { NextRequest, NextResponse } from "next/server";
import { validateBooking } from "@/lib/booking";

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get("bookingId");

  if (!bookingId) {
    return NextResponse.json(
      { error: "bookingId query parameter is required" },
      { status: 400 },
    );
  }

  const result = await validateBooking(bookingId);

  if (result.status === "not_found") {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
