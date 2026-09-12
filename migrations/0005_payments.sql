-- The money the organizer saw arrive. There is no "subscription_id" column:
-- the owning subscription is reached through the member, which is the only
-- path a payment has, and a duplicate would be a second version of the truth
-- that a later edit could contradict.
--
-- A positive amount is deliberate: a correction is an edit or a delete, never
-- a negative row, so there is no refund record to express. The date CHECK is
-- as tight as GLOB can express; the residual gap, a day of 00 or 39 and every
-- impossible day of a real month, is closed by the calendar rule in the
-- validation schema that every write passes through.
--
-- Unlike the tables in 0004, this one does carry an index on its foreign key:
-- nothing else here leads with "member_id", and the payment list is filtered
-- by member for FR-025.
CREATE TABLE "payments" (
  "id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  "amount" INTEGER NOT NULL CHECK (amount > 0),
  "note" TEXT NOT NULL DEFAULT '',
  "tag" TEXT NOT NULL CHECK (tag IN ('manual', 'annual')),
  "created_at" TEXT NOT NULL
);

CREATE INDEX "payments_member_id_idx" ON "payments"("member_id");
