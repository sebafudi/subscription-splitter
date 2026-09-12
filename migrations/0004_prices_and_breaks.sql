-- What the plan cost from each month onward, and the months it was skipped.
-- A positive amount is deliberate: a month that costs nothing is a break
-- month, not a price of zero, and the two differ in whether a standing order
-- counts as received. The month CHECKs are as tight as GLOB can express; the
-- residual gap (00 or 13-19) is closed by the range rule in the validation
-- schema that every write passes through.
--
-- Neither table carries a separate index on its foreign key: the unique
-- constraint and the composite primary key below each lead with
-- "subscription_id", so they already serve every lookup made here, and a
-- second index over the same leading column would earn nothing.
CREATE TABLE "price_history" (
  "id" TEXT PRIMARY KEY,
  "subscription_id" TEXT NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "effective_from" TEXT NOT NULL CHECK (effective_from GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  "amount" INTEGER NOT NULL CHECK (amount > 0),
  UNIQUE("subscription_id", "effective_from")
);

CREATE TABLE "break_months" (
  "subscription_id" TEXT NOT NULL REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "month" TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]'),
  PRIMARY KEY("subscription_id", "month")
);
