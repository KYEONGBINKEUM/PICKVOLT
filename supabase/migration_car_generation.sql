-- Add generation fields to specs_car
ALTER TABLE specs_car ADD COLUMN IF NOT EXISTS generation text;
ALTER TABLE specs_car ADD COLUMN IF NOT EXISTS production_end integer;

-- Comment: generation = e.g. "E210", "F30", "12th Gen", "Highland"
-- launch_year (from specs_common) = production start year
-- production_end = year production ended (null = still in production)
