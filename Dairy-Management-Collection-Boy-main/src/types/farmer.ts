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
}

export interface AddFarmerRequest {
  name: string;
  mobile: string;
  milkType: FarmerMilkType;
  address?: string;
}

export interface UpdateFarmerRequest {
  name?: string;
  mobile?: string;
  milkType?: MilkType[];
  address?: string;
  status?: FarmerStatus;
}
