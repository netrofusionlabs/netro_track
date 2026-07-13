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

// Register routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/companies', companyRouter);
app.use('/api/v1/employees', employeeRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/products', productRouter);

// Global Error Handler Middleware
app.use(errorMiddleware);

export { app };
