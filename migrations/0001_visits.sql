-- The visit log (docs/analytics.md). One row per page view or action.
-- Apply with: npx wrangler d1 migrations apply cross-connect-visits --remote
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  -- 'view' (a page view) or 'event' (an action: contact form opened, call booked, ...)
  kind TEXT NOT NULL,
  -- When it happened, in epoch milliseconds
  t0 INTEGER NOT NULL,
  session TEXT NOT NULL,
  visitor TEXT NOT NULL,
  -- The full record as JSON. Its shape is VisitRecord / EventRecord in worker/visits.ts.
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS visits_t0 ON visits (t0);
