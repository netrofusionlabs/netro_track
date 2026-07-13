export interface AttendanceRecord {
  id: string;
  companyId: string;
  userId: string;
  punchInTime: string;
  punchInLatitude: number;
  punchInLongitude: number;
  punchOutTime: string | null;
  punchOutLatitude: number | null;
  punchOutLongitude: number | null;
  workingHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PunchPayload {
  latitude: number;
  longitude: number;
}
