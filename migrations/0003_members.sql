-- Participants and the whole months each of them took part in. The partial
-- unique index is how "exactly one owner per subscription" stops being a
-- rule a route has to remember (decision D-006). The month CHECKs are as
-- tight as GLOB can express; the residual gap (00 or 13-19) is closed by the
-- range rule in the validation schema that every write passes through.
CREATE TABLE "members" (
  "id" TEXT PRIMARY KEY,
  "subscription_id" TEXT NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "is_owner" INTEGER NOT NULL CHECK (is_owner IN (0, 1)),
  "archived" INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  "created_at" TEXT NOT NULL
);
CREATE INDEX "members_subscription_id_idx" ON "members"("subscription_id");
CREATE UNIQUE INDEX "members_one_owner_idx" ON "members"("subscription_id") WHERE "is_owner" = 1;

CREATE TABLE "active_ranges" (
  "id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "joined_month" TEXT NOT NULL CHECK (joined_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  "left_month" TEXT CHECK (left_month IS NULL OR left_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  CHECK (left_month IS NULL OR left_month >= joined_month)
);
CREATE INDEX "active_ranges_member_id_idx" ON "active_ranges"("member_id");
