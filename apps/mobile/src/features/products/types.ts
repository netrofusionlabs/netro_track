export interface ProductRecord {
  id: string;
  companyId: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit: string | null;
  price: number | null;
  imageUrl: string | null;
  isActive: boolean;
}
