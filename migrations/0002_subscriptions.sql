-- The first table this project owns, and the root every later record hangs
-- from. The month CHECK is as tight as SQLite's GLOB can express; the
-- remaining gap (00 or 13-19) is closed by the range rule in the validation
-- schema that every write passes through. ON DELETE CASCADE matches every
-- auth table carried over from the spike, so a removed account's own
-- subscriptions do not linger.
CREATE TABLE "subscriptions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "time_zone" TEXT NOT NULL,
  "start_month" TEXT NOT NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  "created_at" TEXT NOT NULL
);
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");
