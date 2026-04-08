-- Update user-related foreign keys for GDPR self-deletion cascades
ALTER TABLE "Character" DROP CONSTRAINT "Character_userId_fkey";
ALTER TABLE "Character"
  ADD CONSTRAINT "Character_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" DROP CONSTRAINT "Event_createdById_fkey";
ALTER TABLE "Event"
  ADD CONSTRAINT "Event_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_eventId_fkey";
ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_userId_fkey";
ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Strategy" DROP CONSTRAINT "Strategy_createdById_fkey";
ALTER TABLE "Strategy"
  ADD CONSTRAINT "Strategy_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Poll" DROP CONSTRAINT "Poll_createdById_fkey";
ALTER TABLE "Poll"
  ADD CONSTRAINT "Poll_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
