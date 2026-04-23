ALTER TABLE "bookings" ALTER COLUMN "check_in_time" SET DEFAULT '13:00:00';--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "check_in_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "check_out_time" SET DEFAULT '10:00:00';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guest" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "room" text;