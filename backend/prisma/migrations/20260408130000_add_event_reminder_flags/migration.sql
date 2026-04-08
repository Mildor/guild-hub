-- Add reminder tracking flags to avoid duplicate reminder notifications
ALTER TABLE "Event"
ADD COLUMN "reminderSent1Day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reminderSent3Hours" BOOLEAN NOT NULL DEFAULT false;
