import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from '../../shared/types/request';

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
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/mpin/setup  (authenticated)
   * Sets or updates the MPIN for the currently logged-in user.
   */
  public setupMpin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { mpin } = req.body;

      await this.authService.setupMpin(userId, mpin);

      res.status(200).json({
        success: true,
        message: 'MPIN set successfully',
        data: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/mpin/verify  (authenticated)
   * Verifies the MPIN for the currently logged-in user.
   * Used by the daily MPIN entry screen.
   */
  public verifyMpin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { mpin } = req.body;

      await this.authService.verifyMpin(userId, mpin);

      res.status(200).json({
        success: true,
        message: 'MPIN verified',
        data: null,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/mpin  (public)
   * Full MPIN login — resolves user by loginId, checks MPIN, returns tokens.
   */
  public mpinLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { loginId, mpin, deviceId } = req.body;

      const result = await this.authService.mpinLogin({ loginId, mpin, deviceId });

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: result,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };
}
