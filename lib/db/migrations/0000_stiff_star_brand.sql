CREATE TABLE "test" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "test_email_unique" UNIQUE("email")
);
