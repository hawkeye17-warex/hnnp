-- Add orgId to AdminUser and link to Org
ALTER TABLE "AdminUser"
ADD COLUMN IF NOT EXISTS "orgId" TEXT;

-- If table is empty this is enough; if rows exist, backfill here (set to a valid org id).
-- Example backfill to demo org (safe if table empty):
UPDATE "AdminUser" SET "orgId" = 'de43ed7c-b43a-4644-8eed-28591792cc23' WHERE "orgId" IS NULL;

ALTER TABLE "AdminUser"
ALTER COLUMN "orgId" SET NOT NULL;

ALTER TABLE "AdminUser"
ADD CONSTRAINT "AdminUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AdminUser_orgId_idx" ON "AdminUser"("orgId");

-- Link AuditLog.orgId to Org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_orgId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
