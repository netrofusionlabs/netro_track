import { z } from 'zod';

export const CompanyProfileSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  code: z.string().min(2, "Company code must be at least 2 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Company code can only contain letters, numbers, hyphens, and underscores"),
  officialEmail: z.string().email("Invalid official email address").optional().or(z.literal('')),
  country: z.string().min(2, "Country is required").optional().or(z.literal('')),
  legalName: z.string().optional(),
  industry: z.string().optional().or(z.literal('')),
  companyType: z.string().optional().or(z.literal('')),
  employeeCount: z.string().optional().or(z.literal('')),
  website: z.string().url("Invalid website URL").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  taxId: z.string().optional().or(z.literal('')),
  registrationNumber: z.string().optional().or(z.literal('')),
  timezone: z.string().optional().or(z.literal('')),
  currency: z.string().optional().or(z.literal('')),
  addressLine1: z.string().optional().or(z.literal('')),
  addressLine2: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
});

export const CompanyWizardSchema = z.object({
  company: CompanyProfileSchema,
  admin: z.object({
    name: z.string().min(2, "Admin name is required"),
    email: z.string().email("Invalid admin email address"),
    mobile: z.string().min(10, "Mobile number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
  modules: z.object({
    attendance: z.boolean().default(false),
    leave: z.boolean().default(false),
    shift: z.boolean().default(false),
    gps: z.boolean().default(true),
    payroll: z.boolean().default(false),
    expense: z.boolean().default(false),
    asset: z.boolean().default(false),
    performance: z.boolean().default(false),
    recruitment: z.boolean().default(false),
    regularization: z.boolean().default(false),
  }).default({
    attendance: false,
    leave: false,
    shift: false,
    gps: true,
    payroll: false,
    expense: false,
    asset: false,
    performance: false,
    recruitment: false,
    regularization: false,
  })
});

export type CreateCompanyWizardInput = z.infer<typeof CompanyWizardSchema>;

export const UpdateCompanySchema = CompanyProfileSchema.partial().extend({
  isGpsEnabled: z.boolean().optional(),
  modules: z.record(z.boolean()).optional(),
});

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
