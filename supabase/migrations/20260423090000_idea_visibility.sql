-- Add visibility column to business_ideas
-- private = internal only, no public landing page
-- public = external landing + business model auto-generated at /hunt/[slug]

ALTER TABLE business_ideas
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public','private'));

CREATE INDEX IF NOT EXISTS business_ideas_visibility_idx
  ON business_ideas(visibility);
