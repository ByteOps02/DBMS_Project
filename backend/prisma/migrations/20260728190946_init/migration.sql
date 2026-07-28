-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'guard', 'host', 'visitor');

-- CreateEnum
CREATE TYPE "visit_status" AS ENUM ('pending', 'approved', 'denied', 'completed', 'cancelled', 'checked-in');

-- CreateEnum
CREATE TYPE "pass_type" AS ENUM ('single_day', 'multi_day');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_id" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp" TEXT,
    "otp_expiry" TIMESTAMP(3),
    "department_id" UUID,
    "role" "user_role" NOT NULL DEFAULT 'visitor',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photo_url" TEXT,
    "id_proof_url" TEXT,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklist_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visitor_id" UUID NOT NULL,
    "host_id" UUID,
    "purpose" TEXT NOT NULL,
    "status" "visit_status" NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(6),
    "expected_out_time" TIMESTAMPTZ(6),
    "vehicle_number" TEXT,
    "vehicle_type" TEXT,
    "entry_gate" TEXT,
    "exit_gate" TEXT,
    "additional_guests" INTEGER NOT NULL DEFAULT 0,
    "pass_type" "pass_type" NOT NULL DEFAULT 'single_day',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hosts_email_key" ON "hosts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hosts_google_id_key" ON "hosts"("google_id");

-- CreateIndex
CREATE INDEX "idx_hosts_email" ON "hosts"("email");

-- CreateIndex
CREATE INDEX "idx_visitors_email_phone" ON "visitors"("email", "phone");

-- CreateIndex
CREATE INDEX "idx_visitors_email" ON "visitors"("email");

-- CreateIndex
CREATE INDEX "idx_visits_status" ON "visits"("status");

-- CreateIndex
CREATE INDEX "idx_visits_created_at" ON "visits"("created_at");

-- CreateIndex
CREATE INDEX "idx_visits_host_id" ON "visits"("host_id");

-- CreateIndex
CREATE INDEX "idx_visits_visitor_id" ON "visits"("visitor_id");

-- AddForeignKey
ALTER TABLE "hosts" ADD CONSTRAINT "hosts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "hosts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "hosts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
