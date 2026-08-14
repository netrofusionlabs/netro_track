-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('ATTENDANCE', 'LEAVE', 'SHIFT', 'GPS', 'PAYROLL', 'EXPENSE', 'ASSET', 'PERFORMANCE', 'RECRUITMENT');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "company_type" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "official_email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "company_modules" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "module" "ModuleType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "configuration" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_modules_company_id_module_key" ON "company_modules"("company_id", "module");

-- AddForeignKey
ALTER TABLE "company_modules" ADD CONSTRAINT "company_modules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
