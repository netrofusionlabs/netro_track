-- CreateTable: company_roles
CREATE TABLE "company_roles" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "company_id"  UUID         NOT NULL,
    "name"        TEXT         NOT NULL,
    "code"        TEXT         NOT NULL,
    "rank"        INTEGER      NOT NULL,
    "description" TEXT,
    "is_system"   BOOLEAN      NOT NULL DEFAULT false,
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    "deleted_at"  TIMESTAMP(3),

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approval_actions
CREATE TABLE "approval_actions" (
    "id"                          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "company_id"                  UUID         NOT NULL,
    "request_type"                TEXT         NOT NULL,
    "request_id"                  UUID         NOT NULL,
    "action"                      TEXT         NOT NULL,
    "remarks"                     TEXT,
    "approver_id"                 UUID         NOT NULL,
    "approver_name"               TEXT         NOT NULL,
    "approver_role"               TEXT         NOT NULL,
    "approver_role_rank"          INTEGER,
    "approver_company_role_name"  TEXT,
    "requester_id"                UUID         NOT NULL,
    "requester_name"              TEXT         NOT NULL,
    "requester_role"              TEXT         NOT NULL,
    "requester_role_rank"         INTEGER,
    "requester_company_role_name" TEXT,
    "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_actions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add company_role_id FK to users
ALTER TABLE "users" ADD COLUMN "company_role_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_company_id_code_key" ON "company_roles"("company_id", "code");
CREATE UNIQUE INDEX "company_roles_company_id_rank_key" ON "company_roles"("company_id", "rank");
CREATE INDEX "company_roles_company_id_is_active_idx" ON "company_roles"("company_id", "is_active");

CREATE INDEX "approval_actions_company_id_request_type_request_id_idx" ON "approval_actions"("company_id", "request_type", "request_id");
CREATE INDEX "approval_actions_approver_id_idx"  ON "approval_actions"("approver_id");
CREATE INDEX "approval_actions_requester_id_idx" ON "approval_actions"("requester_id");

-- AddForeignKey: company_roles -> companies
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: users.company_role_id -> company_roles
ALTER TABLE "users" ADD CONSTRAINT "users_company_role_id_fkey"
    FOREIGN KEY ("company_role_id") REFERENCES "company_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing companies with default CompanyRole rows and assign users
DO $$
DECLARE
  c RECORD;
  admin_role_id   UUID;
  hr_role_id      UUID;
  manager_role_id UUID;
  employee_role_id UUID;
BEGIN
  FOR c IN SELECT id FROM companies WHERE deleted_at IS NULL LOOP
    INSERT INTO company_roles (id, company_id, name, code, rank, is_system, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), c.id, 'Company Admin', 'COMPANY_ADMIN', 1, true,  true, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO company_roles (id, company_id, name, code, rank, is_system, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), c.id, 'HR',            'HR',            2, false, true, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO company_roles (id, company_id, name, code, rank, is_system, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), c.id, 'Manager',       'MANAGER',       3, false, true, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;

    INSERT INTO company_roles (id, company_id, name, code, rank, is_system, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), c.id, 'Employee',      'EMPLOYEE',      5, false, true, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;

    SELECT id INTO admin_role_id    FROM company_roles WHERE company_id = c.id AND code = 'COMPANY_ADMIN';
    SELECT id INTO hr_role_id       FROM company_roles WHERE company_id = c.id AND code = 'HR';
    SELECT id INTO manager_role_id  FROM company_roles WHERE company_id = c.id AND code = 'MANAGER';
    SELECT id INTO employee_role_id FROM company_roles WHERE company_id = c.id AND code = 'EMPLOYEE';

    UPDATE users SET company_role_id = admin_role_id    WHERE company_id = c.id AND role = 'COMPANY_ADMIN' AND deleted_at IS NULL AND company_role_id IS NULL;
    UPDATE users SET company_role_id = hr_role_id       WHERE company_id = c.id AND role = 'HR'            AND deleted_at IS NULL AND company_role_id IS NULL;
    UPDATE users SET company_role_id = manager_role_id  WHERE company_id = c.id AND role = 'MANAGER'       AND deleted_at IS NULL AND company_role_id IS NULL;
    UPDATE users SET company_role_id = employee_role_id WHERE company_id = c.id AND role = 'EMPLOYEE'      AND deleted_at IS NULL AND company_role_id IS NULL;
  END LOOP;
END $$;
