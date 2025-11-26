-- DropForeignKey
ALTER TABLE "Break" DROP CONSTRAINT "Break_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_orgId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_profileId_fkey";

-- DropIndex
DROP INDEX "QuizQuestion_quizId_idx";

-- DropIndex
DROP INDEX "QuizSession_createdBy_idx";

-- DropIndex
DROP INDEX "QuizSession_orgId_idx";

-- DropIndex
DROP INDEX "QuizSession_receiverId_idx";

-- DropIndex
DROP INDEX "QuizSubmission_profileId_idx";

-- DropIndex
DROP INDEX "QuizSubmission_quizId_idx";

-- DropIndex
DROP INDEX "UserProfile_orgId_idx";

-- DropIndex
DROP INDEX "UserProfile_userId_idx";

-- AlterTable
ALTER TABLE "Break" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedBy" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuizQuestion" DROP COLUMN "correctoption",
DROP COLUMN "createdat",
DROP COLUMN "optionsjson",
DROP COLUMN "quizid",
DROP COLUMN "timelimitsec",
ADD COLUMN     "correctOption" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "optionsJson" JSONB,
ADD COLUMN     "quizId" TEXT NOT NULL,
ADD COLUMN     "timeLimitSec" INTEGER;

-- AlterTable
ALTER TABLE "QuizSession" DROP COLUMN "courseid",
DROP COLUMN "createdat",
DROP COLUMN "createdby",
DROP COLUMN "endtime",
DROP COLUMN "orgid",
DROP COLUMN "receiverid",
DROP COLUMN "settingsjson",
DROP COLUMN "starttime",
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "receiverId" TEXT,
ADD COLUMN     "settingsJson" JSONB,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "testMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuizSubmission" DROP COLUMN "answersjson",
DROP COLUMN "createdat",
DROP COLUMN "profileid",
DROP COLUMN "quizid",
DROP COLUMN "submittedat",
ADD COLUMN     "answersJson" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "profileId" TEXT NOT NULL,
ADD COLUMN     "quizId" TEXT NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedBy" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "createdat",
DROP COLUMN "orgid",
DROP COLUMN "userid",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "auth_logs";

-- DropTable
DROP TABLE "organizations";

-- DropTable
DROP TABLE "presence_logs";

-- DropTable
DROP TABLE "receivers";

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "actorKey" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizSession_orgId_idx" ON "QuizSession"("orgId");

-- CreateIndex
CREATE INDEX "QuizSession_receiverId_idx" ON "QuizSession"("receiverId");

-- CreateIndex
CREATE INDEX "QuizSession_createdBy_idx" ON "QuizSession"("createdBy");

-- CreateIndex
CREATE INDEX "QuizSubmission_quizId_idx" ON "QuizSubmission"("quizId");

-- CreateIndex
CREATE INDEX "QuizSubmission_profileId_idx" ON "QuizSubmission"("profileId");

-- CreateIndex
CREATE INDEX "UserProfile_userId_idx" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_orgId_idx" ON "UserProfile"("orgId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "QuizSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "QuizSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSubmission" ADD CONSTRAINT "QuizSubmission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Break" ADD CONSTRAINT "Break_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

