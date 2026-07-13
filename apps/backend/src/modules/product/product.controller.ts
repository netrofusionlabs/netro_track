import { Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { AuthenticatedRequest } from '../../shared/middlewares/auth.middleware';

export class ProductController {
  private productService = new ProductService();

  public getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const products = await this.productService.getAllProducts(companyId);
      res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: products,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public getProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const product = await this.productService.getProductById(companyId, req.params.id);
      res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: product,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public createProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { name, sku, description, unit, price, imageUrl, isActive } = req.body;

      const product = await this.productService.createProduct(companyId, {
        name,
        sku,
        description,
        unit,
        price,
        imageUrl,
        isActive
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      const { name, sku, description, unit, price, imageUrl, isActive } = req.body;

      const product = await this.productService.updateProduct(companyId, req.params.id, {
        name,
        sku,
        description,
        unit,
        price,
        imageUrl,
        isActive
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
        meta: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteProduct = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.user!.companyId;
      await this.productService.deleteProduct(companyId, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}
