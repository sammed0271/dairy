export type MilkType = "cow" | "buffalo" | "mix";
export type FarmerMilkType = MilkType[];

export type MilkTypeUI = MilkType | "both";

export type FarmerStatus = "Active" | "Inactive";

export interface Farmer {
  _id: string;
  code: string;
  name: string;
  mobile: string;
  milkType: FarmerMilkType;
  status: FarmerStatus;
  joinDate: string;
  address?: string;
  centreId?:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        status: string;
      }
    | null;
}

export interface AddFarmerRequest {
  name: string;
  mobile: string;
  milkType: FarmerMilkType;
  address?: string;
  centreId?: string;
}

export interface UpdateFarmerRequest {
  name?: string;
  mobile?: string;
  milkType?: MilkType[];
  address?: string;
  status?: FarmerStatus;
}

export interface FarmerTransferRecord {
  _id: string;
  farmerId: string;
  fromCentreId: {
    _id: string;
    name: string;
    code: string;
  };
  toCentreId: {
    _id: string;
    name: string;
    code: string;
  };
  transferredBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  note: string;
  createdAt: string;
}
