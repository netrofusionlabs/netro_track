import { ProductRepository } from './product.repository';
import { AppError } from '../../shared/errors/AppError';
import { Product } from '@prisma/client';

export class ProductService {
  private productRepository = new ProductRepository();

  public async getAllProducts(companyId: string): Promise<Product[]> {
    return this.productRepository.findMany(companyId);
  }

  public async getProductById(companyId: string, id: string): Promise<Product> {
    const product = await this.productRepository.findById(companyId, id);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }
    return product;
  }

  public async createProduct(
    companyId: string,
    data: {
      name: string;
      sku?: string | null;
      description?: string | null;
      unit?: string | null;
      price?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
    }
  ): Promise<Product> {
    return this.productRepository.create({
      companyId,
      ...data
    });
  }

  public async updateProduct(
    companyId: string,
    id: string,
    data: {
      name?: string;
      sku?: string | null;
      description?: string | null;
      unit?: string | null;
      price?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
    }
  ): Promise<Product> {
    await this.getProductById(companyId, id);
    return this.productRepository.update(companyId, id, data);
  }

  public async deleteProduct(companyId: string, id: string): Promise<Product> {
    await this.getProductById(companyId, id);
    return this.productRepository.softDelete(companyId, id);
  }
}
