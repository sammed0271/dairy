// src/context/FarmerContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Farmer, MilkType } from "../types/farmer";
import { addFarmer as addFarmerAPI, getFarmers } from "../axios/farmer_api";

type AddFarmerInput = {
  name: string;
  mobile: string;
  milkType: MilkType[];
  address?: string;
};

type FarmerContextValue = {
  farmers: Farmer[];
  addFarmer: (input: AddFarmerInput) => Promise<void>;
  reloadFarmers: () => Promise<void>;
  loading: boolean;
};

const FarmerContext = createContext<FarmerContextValue | undefined>(undefined);

export const FarmerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Load farmers from backend
  const reloadFarmers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getFarmers();
      setFarmers(res.data);
    } catch (error) {
      console.error("Error fetching farmers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadFarmers();
  }, []);

  // Add farmer using backend API
  const addFarmer = async (input: AddFarmerInput) => {
    try {
      setLoading(true);

      await addFarmerAPI({
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        address: input.address?.trim() || "",
        milkType: input.milkType,
      });

      // refresh list after adding
      await reloadFarmers();
    } catch (error) {
      console.error("Error adding farmer:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FarmerContext.Provider
      value={{ farmers, addFarmer, reloadFarmers, loading }}
    >
      {children}
    </FarmerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFarmerContext = (): FarmerContextValue => {
  const ctx = useContext(FarmerContext);
  if (!ctx) {
    throw new Error("useFarmerContext must be used inside <FarmerProvider>");
  }
  return ctx;
};
