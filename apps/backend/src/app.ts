import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorMiddleware } from './shared/middlewares/error.middleware';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health endpoint
app.use('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Import modules
import { authRouter } from './modules/auth/auth.routes';
import { companyRouter } from './modules/company/company.routes';
import { employeeRouter } from './modules/employee/employee.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { productRouter } from './modules/product/product.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { visitRouter } from './modules/visit/visit.routes';
import { saleRouter } from './modules/sale/sale.routes';
import { inspectionRouter } from './modules/inspection/inspection.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { trackingRouter } from './modules/tracking/tracking.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { reportRouter } from './modules/report/report.routes';
import { userManagementRouter } from './modules/user-management/user-management.routes';
import { profileRouter } from './modules/profile/profile.routes';
import { attendancePolicyRouter } from './modules/attendance-policy/attendance-policy.routes';
import { policyRouter } from './modules/policy/policy.routes';
import path from 'path';

// Static assets serving
app.use('/static/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Register routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users/me', profileRouter);
app.use('/api/v1/user-management', userManagementRouter);
app.use('/api/v1/companies', companyRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/attendance-policies', attendancePolicyRouter);
app.use('/api/v1/policies', policyRouter);
app.use('/api/v1/customer-visits', visitRouter);
app.use('/api/v1/product-sales', saleRouter);
app.use('/api/v1/inspections', inspectionRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/tracking', trackingRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/reports', reportRouter);

// Global Error Handler Middleware
app.use(errorMiddleware);

export { app };
