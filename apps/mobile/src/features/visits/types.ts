export interface VisitRecord {
  id: string;
  companyId: string;
  userId: string;
  customerId: string;
  checkInTime: string;
  checkOutTime: string | null;
  duration: number | null;
  latitude: number;
  longitude: number;
  productsDiscussed: string | null;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
  customer?: { id: string; name: string; type: string | null };
  user?: { id: string; name: string };
}

export interface CreateVisitPayload {
  customerId: string;
  checkInTime: string;
  checkOutTime?: string;
  latitude: number;
  longitude: number;
  productsDiscussed?: string;
  notes?: string;
  imageUrl?: string;
}
