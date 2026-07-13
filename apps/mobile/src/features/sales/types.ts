export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  product?: { id: string; name: string; sku: string | null; unit: string | null };
}

export interface SaleRecord {
  id: string;
  companyId: string;
  userId: string;
  customerId: string;
  totalAmount: number;
  remarks: string | null;
  createdAt: string;
  items: SaleItem[];
  customer?: { id: string; name: string };
  user?: { id: string; name: string };
}

export interface CreateSaleItemPayload {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateSalePayload {
  customerId: string;
  remarks?: string;
  items: CreateSaleItemPayload[];
}
