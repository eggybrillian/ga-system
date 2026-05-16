-- Create object_types table and migrate existing enum values into it
CREATE TABLE IF NOT EXISTS "object_types" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "object_types" ADD CONSTRAINT IF NOT EXISTS "object_types_slug_unique" UNIQUE ("slug");

-- Insert current enum values into object_types if not present
INSERT INTO "object_types" ("id","name","slug","sort_order","is_active")
SELECT gen_random_uuid(), val, val, row_number() OVER (), true
FROM (VALUES ('mess'),('office'),('vehicle'),('meeting_room')) AS t(val)
WHERE NOT EXISTS (SELECT 1 FROM "object_types" ot WHERE ot.slug = t.val);

-- Add new FK column to objects and questions
ALTER TABLE "objects" ADD COLUMN IF NOT EXISTS "object_type_id" uuid;
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "object_type_id" uuid;

-- Populate object_type_id from existing enum column if present
UPDATE "object_types" SET "slug" = LOWER("slug");
UPDATE "objects" SET object_type_id = ot.id
FROM "object_types" ot
WHERE objects.type::text = ot.slug;

UPDATE "questions" SET object_type_id = ot.id
FROM "object_types" ot
WHERE questions.object_type::text = ot.slug;

-- Make columns NOT NULL where possible
ALTER TABLE "objects" ALTER COLUMN "object_type_id" SET NOT NULL;
ALTER TABLE "questions" ALTER COLUMN "object_type_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "objects" ADD CONSTRAINT IF NOT EXISTS "objects_object_type_id_fkey" FOREIGN KEY ("object_type_id") REFERENCES "object_types" ("id") ON DELETE RESTRICT;
ALTER TABLE "questions" ADD CONSTRAINT IF NOT EXISTS "questions_object_type_id_fkey" FOREIGN KEY ("object_type_id") REFERENCES "object_types" ("id") ON DELETE RESTRICT;

-- NOTE: we keep the old enum columns for compatibility; they can be dropped in a later migration after code changes are deployed.
