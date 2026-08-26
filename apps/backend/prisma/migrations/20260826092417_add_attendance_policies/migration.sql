-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('ATTENDANCE', 'LEAVE', 'EXPENSE', 'TRACKING', 'VISIT', 'INSPECTION');

-- CreateEnum
CREATE TYPE "PolicyTargetType" AS ENUM ('COMPANY', 'DEPARTMENT', 'DESIGNATION', 'USER');

-- CreateEnum
CREATE TYPE "RegularizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE 'REGULARIZATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TimelineEventType" ADD VALUE 'ATTENDANCE_POLICY_ASSIGNED';
ALTER TYPE "TimelineEventType" ADD VALUE 'ATTENDANCE_POLICY_CHANGED';
ALTER TYPE "TimelineEventType" ADD VALUE 'POLICY_ASSIGNED';
ALTER TYPE "TimelineEventType" ADD VALUE 'POLICY_CHANGED';

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "attendance_policy_id" UUID,
ADD COLUMN     "policy_snapshot" JSONB,
ADD COLUMN     "punch_in_evidence" JSONB,
ADD COLUMN     "punch_out_evidence" JSONB;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "default_attendance_policy_id" UUID;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "attendance_policy_id" UUID;

-- AlterTable
ALTER TABLE "designations" ADD COLUMN     "attendance_policy_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "attendance_policy_id" UUID;

-- CreateTable
CREATE TABLE "attendance_regularizations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attendance_id" UUID,
    "date" DATE NOT NULL,
    "requested_punch_in" TIMESTAMP(3),
    "requested_punch_out" TIMESTAMP(3),
    "original_punch_in" TIMESTAMP(3),
    "original_punch_out" TIMESTAMP(3),
    "requested_punch_in_odometer" INTEGER,
    "requested_punch_out_odometer" INTEGER,
    "original_punch_in_odometer" INTEGER,
    "original_punch_out_odometer" INTEGER,
    "reason" TEXT NOT NULL,
    "status" "RegularizationStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_regularizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "PolicyType" NOT NULL DEFAULT 'ATTENDANCE',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "punch_in_config" JSONB NOT NULL,
    "punch_out_config" JSONB NOT NULL,
    "regularization_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_assignments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "policy_type" "PolicyType" NOT NULL,
    "target_type" "PolicyTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_regularizations_company_id_idx" ON "attendance_regularizations"("company_id");

-- CreateIndex
CREATE INDEX "attendance_regularizations_user_id_idx" ON "attendance_regularizations"("user_id");

-- CreateIndex
CREATE INDEX "attendance_policies_company_id_idx" ON "attendance_policies"("company_id");

-- CreateIndex
CREATE INDEX "attendance_policies_company_id_type_idx" ON "attendance_policies"("company_id", "type");

-- CreateIndex
CREATE INDEX "policy_assignments_company_id_policy_type_idx" ON "policy_assignments"("company_id", "policy_type");

-- CreateIndex
CREATE INDEX "policy_assignments_target_type_target_id_idx" ON "policy_assignments"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_assignments_company_id_policy_type_target_type_targe_key" ON "policy_assignments"("company_id", "policy_type", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_default_attendance_policy_id_fkey" FOREIGN KEY ("default_attendance_policy_id") REFERENCES "attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_attendance_policy_id_fkey" FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_attendance_policy_id_fkey" FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_attendance_policy_id_fkey" FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_attendance_policy_id_fkey" FOREIGN KEY ("attendance_policy_id") REFERENCES "attendance_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_regularizations" ADD CONSTRAINT "attendance_regularizations_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_assignments" ADD CONSTRAINT "policy_assignments_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "attendance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
