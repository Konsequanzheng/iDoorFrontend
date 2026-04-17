import { date, pgTable, text, time } from "drizzle-orm/pg-core";

export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  checkInTime: time("check_in_time").default("12:00").notNull(),
  checkOutTime: time("check_out_time").default("10:00").notNull(),
});
