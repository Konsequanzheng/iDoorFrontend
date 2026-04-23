import { pgTable, text, date, time } from "drizzle-orm/pg-core";

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey().notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  checkInTime: time("check_in_time").default("13:00:00"),
  checkOutTime: time("check_out_time").default("10:00:00").notNull(),
  guest: text("guest"),
  room: text("room"),
});
