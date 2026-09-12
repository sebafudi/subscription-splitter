-- Standing orders and the single months of them that did not arrive.
--
-- "end_month >= start_month" is expressible here because both columns sit on
-- one row, so unlike the overlap rule it is not something a route has to
-- remember. The overlap between two arrangements for one member cannot be a
-- constraint at all: SQLite has no exclusion constraint, so that rule is a
-- read-then-check in the route (decision D-007).
--
-- The month CHECKs are as tight as GLOB can express; the residual gap, 00 and
-- 13 to 19, is closed by the range rule in the validation schema every write
-- passes through. Neither table carries "created_at": neither is ever ordered
-- by when it was entered.
--
-- "recurring_exceptions" needs no separate index because its composite primary
-- key already leads with "schedule_id", which serves every lookup made here.
CREATE TABLE "recurring_schedules" (
  "id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL CHECK (amount > 0),
  "start_month" TEXT NOT NULL CHECK (start_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  "end_month" TEXT CHECK (
    end_month IS NULL
    OR (end_month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND end_month >= start_month)
  )
);

CREATE INDEX "recurring_schedules_member_id_idx" ON "recurring_schedules"("member_id");

CREATE TABLE "recurring_exceptions" (
  "schedule_id" TEXT NOT NULL REFERENCES "recurring_schedules"("id") ON DELETE CASCADE,
  "month" TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  PRIMARY KEY("schedule_id", "month")
);
