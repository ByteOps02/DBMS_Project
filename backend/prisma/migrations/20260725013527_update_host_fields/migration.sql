/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `hosts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "hosts" ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otp_expiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "hosts_google_id_key" ON "hosts"("google_id");
