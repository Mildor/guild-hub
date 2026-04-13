-- CreateTable
CREATE TABLE "FailedLoginAttempt" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "identifier" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FailedLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FailedLoginAttempt_createdAt_idx" ON "FailedLoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "FailedLoginAttempt_provider_idx" ON "FailedLoginAttempt"("provider");
