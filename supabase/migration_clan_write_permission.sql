-- Add write_permission to clans
-- Values: 'everyone' (default), 'moderator' (owner+mod), 'owner' (owner only)
ALTER TABLE clans
  ADD COLUMN IF NOT EXISTS write_permission text NOT NULL DEFAULT 'everyone'
  CHECK (write_permission IN ('everyone', 'moderator', 'owner'));
