CREATE TYPE "public"."category" AS ENUM('facility_quality', 'service_performance', 'user_satisfaction');--> statement-breakpoint
CREATE TYPE "public"."notification_trigger" AS ENUM('below_threshold', 'new_critical_feedback', 'period_closing_soon', 'period_opened', 'escalation_to_superior');--> statement-breakpoint
CREATE TYPE "public"."object_type" AS ENUM('mess', 'office', 'vehicle', 'meeting_room');--> statement-breakpoint
CREATE TYPE "public"."period_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."period_type" AS ENUM('monthly', 'event_based');--> statement-breakpoint
CREATE TYPE "public"."recipient_type" AS ENUM('ga_staff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('success', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "admin_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik" varchar(50) NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'admin' NOT NULL,
	"granted_by" varchar(50),
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "admin_flags_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "evaluation_forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"submitted_at" timestamp,
	"archive_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_forms_object_id_user_id_period_id_unique" UNIQUE("object_id","user_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(100) NOT NULL,
	"type" "period_type" DEFAULT 'monthly' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" "period_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"category" "category" NOT NULL,
	"score" integer NOT NULL,
	"comment" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "ga_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"nik" varchar(50) NOT NULL,
	"position" varchar(255),
	"odoo_employee_id" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ga_staff_nik_unique" UNIQUE("nik"),
	CONSTRAINT "ga_staff_odoo_employee_id_unique" UNIQUE("odoo_employee_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" "recipient_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"message" text NOT NULL,
	"trigger" "notification_trigger" NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "object_user_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "object_user_assignments_object_id_user_id_unique" UNIQUE("object_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "object_type" NOT NULL,
	"pic_ga_id" uuid,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type" "object_type" NOT NULL,
	"category" "category" NOT NULL,
	"text" varchar(500) NOT NULL,
	"weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"triggered_by" varchar(50) NOT NULL,
	"status" "sync_status" NOT NULL,
	"records_upserted" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"nik" varchar(50) NOT NULL,
	"department" varchar(255),
	"odoo_employee_id" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_period_id_evaluation_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."evaluation_periods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_form_id_evaluation_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."evaluation_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_user_assignments" ADD CONSTRAINT "object_user_assignments_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_user_assignments" ADD CONSTRAINT "object_user_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_pic_ga_id_ga_staff_id_fk" FOREIGN KEY ("pic_ga_id") REFERENCES "public"."ga_staff"("id") ON DELETE set null ON UPDATE no action;