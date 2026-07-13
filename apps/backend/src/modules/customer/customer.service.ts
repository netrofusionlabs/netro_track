import { CustomerRepository } from './customer.repository';
import { AppError } from '../../shared/errors/AppError';
import { Customer } from '@prisma/client';

export class CustomerService {
  private customerRepository = new CustomerRepository();

  public async getAllCustomers(companyId: string): Promise<Customer[]> {
    return this.customerRepository.findMany(companyId);
  }

  public async getCustomerById(companyId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(companyId, id);
    if (!customer) {
      throw new AppError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    }
    return customer;
  }

  public async createCustomer(
    companyId: string,
    data: {
      name: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      village?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      type?: string | null;
      createdById?: string | null;
    }
  ): Promise<Customer> {
    return this.customerRepository.create({
      companyId,
      ...data
    });
  }

  public async updateCustomer(
    companyId: string,
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      village?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      type?: string | null;
    }
  ): Promise<Customer> {
    await this.getCustomerById(companyId, id);
    return this.customerRepository.update(companyId, id, data);
  }

  public async deleteCustomer(companyId: string, id: string): Promise<Customer> {
    await this.getCustomerById(companyId, id);
    return this.customerRepository.softDelete(companyId, id);
  }
}
