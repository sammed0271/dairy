export type CentreMetrics = {
  adminCount: number;
  farmerCount: number;
  milkEntryCount: number;
};

export type CentreRecord = {
  _id: string;
  name: string;
  code: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  paymentCycle: string;
  rateType: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  metrics?: CentreMetrics;
};

export type AdminRecord = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "superadmin";
  status: "active" | "disabled";
  centreId:
    | {
        _id: string;
        name: string;
        code: string;
        status: string;
        district?: string;
      }
    | null;
  createdAt: string;
  updatedAt: string;
};
