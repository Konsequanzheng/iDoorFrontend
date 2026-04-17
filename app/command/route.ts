import { NextResponse } from "next/server";
import { publish } from "@/lib/MQTTClient";
import { validateBooking } from "@/lib/booking";

export async function POST(request: Request) {
  const body = await request.json();
  const { doorId, bookingId } = body;

  if (!bookingId || !doorId) {
    return NextResponse.json(
      { error: "bookingId and doorId are required" },
      { status: 400 },
    );
  }

  const result = await validateBooking(String(bookingId));

  if (result.status !== "valid") {
    return NextResponse.json(
      { error: "Booking not valid", bookingStatus: result.status },
      { status: 403 },
    );
  }

  const topic =
    doorId === "building"
      ? "nuki/idoor/door_relay/command"
      : "nuki/idoor/lock/command";
  const payload = doorId === "building" ? "TRIGGER" : "UNLATCH";

  try {
    await publish(topic, payload);
  } catch {
    return NextResponse.json(
      { error: "Failed to publish MQTT message" },
      { status: 500 },
    );
  }

  return NextResponse.json({ bookingId, doorId }, { status: 201 });
}
