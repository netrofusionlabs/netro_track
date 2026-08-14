import { CompanyRepository } from './src/modules/company/company.repository';
import * as argon2 from 'argon2';

async function run() {
  try {
    const repo = new CompanyRepository();
    const payload = {
      company: {
        name: "Infobell IT Solutions Pvt. Ltd.",
        code: "IB3",
        legalName: "Infobell IT Solutions Pvt. Ltd.",
        industry: "Information Technology",
        companyType: "Private Limited Company",
        employeeCount: "500+",
        officialEmail: "contact@infobellit.com",
        phone: "+91 8317513201",
        addressLine1: "Karle Town",
        addressLine2: "Smarworkts",
        city: "Bangalore",
        state: "Karnataka",
        zipCode: "560036",
        country: "India",
        timezone: "Asia/Kolkata",
        currency: "INR"
      },
      admin: {
        name: "Ramana Bandili",
        email: "ramana2@infobellit.com",
        mobile: "+91 9876544214",
        password: "Password123!",
        confirmPassword: "Password123!"
      },
      modules: {
        attendance: true,
        leave: true,
        shift: true,
        gps: true,
        payroll: true,
        expense: true,
        asset: false,
        performance: false,
        recruitment: false
      }
    };
    
    const hash = await argon2.hash("Password123!");
    await repo.createWizard(payload as any, hash);
    console.log("Success!");
  } catch (e) {
    console.error("Failed:", e);
  }
}

run();
