-- Add multi-answer support to polls.
ALTER TABLE "Poll"
ADD COLUMN "allowMultipleSelections" BOOLEAN NOT NULL DEFAULT false;

-- Allow one user to select multiple options in the same poll while preventing duplicates.
ALTER TABLE "PollVote"
DROP CONSTRAINT IF EXISTS "PollVote_pollId_userId_key";

ALTER TABLE "PollVote"
ADD CONSTRAINT "PollVote_pollId_userId_optionId_key" UNIQUE ("pollId", "userId", "optionId");

CREATE INDEX IF NOT EXISTS "PollVote_pollId_userId_idx" ON "PollVote"("pollId", "userId");
