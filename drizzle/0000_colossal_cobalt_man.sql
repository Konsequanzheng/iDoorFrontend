CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"check_in_time" time DEFAULT '12:00' NOT NULL,
	"check_out_time" time DEFAULT '10:00' NOT NULL
);
