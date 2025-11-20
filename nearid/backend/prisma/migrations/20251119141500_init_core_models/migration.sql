-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receiver" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "locationLabel" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "authMode" TEXT NOT NULL,
    "sharedSecretHash" TEXT,
    "publicKeyPem" TEXT,
    "firmwareVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "timeSlot" INTEGER NOT NULL,
    "suspiciousFlags" JSONB,

    CONSTRAINT "PresenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_slug_key" ON "Org"("slug");

-- CreateIndex
CREATE INDEX "Receiver_orgId_idx" ON "Receiver"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyPrefix_key" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_orgId_idx" ON "ApiKey"("orgId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "PresenceEvent_orgId_idx" ON "PresenceEvent"("orgId");

-- CreateIndex
CREATE INDEX "PresenceEvent_deviceId_orgId_idx" ON "PresenceEvent"("deviceId", "orgId");

-- CreateIndex
CREATE INDEX "PresenceEvent_receiverId_orgId_idx" ON "PresenceEvent"("receiverId", "orgId");

-- AddForeignKey
ALTER TABLE "Receiver" ADD CONSTRAINT "Receiver_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEvent" ADD CONSTRAINT "PresenceEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceEvent" ADD CONSTRAINT "PresenceEvent_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

