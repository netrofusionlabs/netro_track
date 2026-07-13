import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private authService = new AuthService();

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { loginId, password, deviceId, os, model, appVersion } = req.body;

      const result = await this.authService.login({
        loginId,
        password,
        deviceId,
        os,
        model,
        appVersion
      });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
