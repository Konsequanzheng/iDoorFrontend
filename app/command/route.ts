import { publish } from "@/lib/MQTTClient";

export async function POST(request: Request) {
  // Parse the request body
  const body = await request.json();
  //   {
  //     "bookingId": "123",
  //     "doorId": "building"
  // }
  const { doorId, bookingId } = body;

  const openRequest = { doorId, bookingId };

  if (bookingId === 123) {
    if (doorId === "building") {
      await publish("nuki/idoor/lock/command", "TRIGGER").catch((err) => {
        console.error("Failed to publish MQTT message:", err);
        return new Response(
          JSON.stringify({ error: "Failed to publish MQTT message" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      });
    } else if (doorId === "apartment") {
      await publish("nuki/idoor/door_relay/command", "UNLATCH").catch(
        (err) => {
          console.error("Failed to publish MQTT message:", err);
          return new Response(
            JSON.stringify({ error: "Failed to publish MQTT message" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      );
    }
  }

  return new Response(JSON.stringify(openRequest), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
