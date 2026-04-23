import { db } from "../lib/db";
import { bookings } from "../lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

interface ParsedEvent {
  uid: string;
  reservationId: string;
  startDate: string;
  endDate: string;
  summary: string;
  description: string;
}

interface RoomCalendar {
  room: string;
  url: string;
}

function extractVEvents(icalText: string): string[] {
  const blocks: string[] = [];
  const regex = /BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g;
  let match;
  while ((match = regex.exec(icalText)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function parseIcalDate(line: string): string {
  const value = line.split(":").pop()!.trim();
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseVEvent(block: string): ParsedEvent | null {
  const unfolded = block.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let uid = "";
  let startDate = "";
  let endDate = "";
  let summary = "";
  let description = "";

  for (const line of lines) {
    if (line.startsWith("UID:")) uid = line.slice(4).trim();
    else if (line.startsWith("DTSTART") && line.includes("VALUE=DATE"))
      startDate = parseIcalDate(line);
    else if (line.startsWith("DTEND") && line.includes("VALUE=DATE"))
      endDate = parseIcalDate(line);
    else if (line.startsWith("SUMMARY:")) summary = line.slice(8).trim();
    else if (line.startsWith("DESCRIPTION:"))
      description = line.slice(12).trim();
  }

  const reservationId = extractReservationId(description);
  if (!uid || !startDate || !endDate || !reservationId) return null;
  return { uid, reservationId, startDate, endDate, summary, description };
}

function extractReservationId(description: string): string | null {
  const match = description.match(/reservations\/details\/(\w+)/i);
  return match ? match[1] : null;
}

async function syncCalendar(roomCalendar: RoomCalendar) {
  console.log(
    `[sync] Fetching calendar for room "${roomCalendar.room}" from ${roomCalendar.url}`
  );

  const response = await fetch(roomCalendar.url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${roomCalendar.url}: ${response.status} ${response.statusText}`
    );
  }
  const icalText = await response.text();

  const veventBlocks = extractVEvents(icalText);
  console.log(`[sync] Found ${veventBlocks.length} VEVENT blocks`);

  const reservedEvents: ParsedEvent[] = [];
  for (const block of veventBlocks) {
    const event = parseVEvent(block);
    if (!event) continue;
    if (event.summary.includes("Not available")) continue;
    if (!event.summary.includes("Reserved")) continue;
    reservedEvents.push(event);
  }
  console.log(`[sync] ${reservedEvents.length} Reserved events to sync`);

  for (const event of reservedEvents) {
    await db
      .insert(bookings)
      .values({
        id: event.reservationId,
        fromDate: event.startDate,
        toDate: event.endDate,
        room: roomCalendar.room,
      })
      .onConflictDoUpdate({
        target: bookings.id,
        set: {
          fromDate: event.startDate,
          toDate: event.endDate,
          room: roomCalendar.room,
        },
      });
  }

  // Delete stale bookings for this room that no longer appear in the feed
  const currentIds = reservedEvents.map((e) => e.reservationId);
  const existing = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.room, roomCalendar.room));

  const staleIds = existing
    .map((b) => b.id)
    .filter((id) => !currentIds.includes(id));

  if (staleIds.length > 0) {
    await db
      .delete(bookings)
      .where(
        and(eq(bookings.room, roomCalendar.room), inArray(bookings.id, staleIds))
      );
    console.log(`[sync] Deleted ${staleIds.length} stale bookings`);
  }

  console.log(
    `[sync] Room "${roomCalendar.room}": upserted ${reservedEvents.length}, deleted ${staleIds.length}`
  );
}

function parseRoomCalendars(envValue: string): RoomCalendar[] {
  return envValue
    .split(",")
    .map((entry) => {
      const [room, url] = entry.split("|").map((s) => s.trim());
      if (!room || !url) {
        console.warn(`[config] Skipping malformed entry: ${entry}`);
        return null;
      }
      return { room, url };
    })
    .filter((c): c is RoomCalendar => c !== null);
}

async function main() {
  const envValue = process.env.ICAL_URLS;
  if (!envValue) {
    console.error("ICAL_URLS environment variable is required");
    console.error('Format: "RoomName|https://ical-url,RoomName2|https://url2"');
    process.exit(1);
  }

  const roomCalendars = parseRoomCalendars(envValue);
  if (roomCalendars.length === 0) {
    console.error("No valid room calendar entries found in ICAL_URLS");
    process.exit(1);
  }

  console.log(`[sync] Starting sync for ${roomCalendars.length} room(s)`);

  for (const rc of roomCalendars) {
    try {
      await syncCalendar(rc);
    } catch (err) {
      console.error(`[sync] Failed to sync room "${rc.room}":`, err);
    }
  }

  console.log(`[sync] Complete`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[sync] Fatal error:", err);
  process.exit(1);
});
