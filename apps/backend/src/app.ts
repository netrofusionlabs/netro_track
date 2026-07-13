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

// Register routes
app.use('/api/v1/auth', authRouter);

// Global Error Handler Middleware
app.use(errorMiddleware);

export { app };
