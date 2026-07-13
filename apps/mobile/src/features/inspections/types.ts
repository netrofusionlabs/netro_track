export interface InspectionRecord {
  id: string;
  companyId: string;
  userId: string;
  siteName: string;
  category: string | null;
  latitude: number;
  longitude: number;
  observation: string;
  recommendation: string | null;
  imageUrls: string[];
  createdAt: string;
  user?: { id: string; name: string };
}

export interface CreateInspectionPayload {
  siteName: string;
  category?: string;
  latitude: number;
  longitude: number;
  observation: string;
  recommendation?: string;
  imageUrls: string[];
}
