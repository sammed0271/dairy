// src/context/AppContext.tsx
import React, { createContext, useEffect, useState } from "react";

import type { Farmer, FarmerMilkType, MilkType } from "../types/farmer";
import type { MilkCollection, MilkShift } from "../types/milkCollection";
import type { Deduction, DeductionCategory } from "../types/deduction";

import { addFarmer as addFarmerAPI, getFarmers } from "../axios/farmer_api";
import {
  addMilkEntry as addMilkEntryAPI,
  getMilkEntries,
} from "../axios/milk_api";
import {
  addDeduction as addDeductionAPI,
  getDeductions,
} from "../axios/deduction_api";

type AppState = {
  initialized: boolean;
  farmers: Farmer[];
  milkCollections: MilkCollection[];
  deductions: Deduction[];
};

type AddFarmerInput = {
  name: string;
  mobile: string;
  // milkType: MilkType;
  milkType:FarmerMilkType;
  address?: string;
};

type AddMilkCollectionInput = {
  date: string;
  shift: MilkShift;
  farmerId: string;
  milkType: MilkType;
  liters: number;
  fat: number;
  snf: number;
  rate: number;
  remarks?: string;
};

type AddDeductionInput = {
  date: string;
  farmerId: string;
  category: DeductionCategory;
  amount: number;
  description?: string;
};

export type AppContextValue = AppState & {
  addFarmer: (input: AddFarmerInput) => Promise<void>;
  addMilkCollection: (input: AddMilkCollectionInput) => Promise<void>;
  addDeduction: (input: AddDeductionInput) => Promise<void>;
  reloadAll: () => Promise<void>;
  loading: boolean;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AppState>({
    initialized: false,
    farmers: [],
    milkCollections: [],
    deductions: [],
  });

  const [loading, setLoading] = useState(false);

  // Load all data from backend
  const reloadAll = async () => {
    try {
      setLoading(true);

      const [farmersRes, milkRes, deductionRes] = await Promise.all([
        getFarmers(),
        getMilkEntries(),
        getDeductions(),
      ]);

      setState({
        initialized: true,
        farmers: farmersRes.data,
        milkCollections: milkRes.data,
        deductions: deductionRes.data,
      });
    } catch (error) {
      console.error("Error loading app data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // Add farmer
  const addFarmer = async (input: AddFarmerInput): Promise<void> => {
    try {
      setLoading(true);

      await addFarmerAPI({
        name: input.name.trim(),
        mobile: input.mobile.trim(),
        milkType: input.milkType,
        address: input.address?.trim() || undefined,
      });

      await reloadAll();
    } catch (error) {
      console.error("Error adding farmer:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add milk collection
  const addMilkCollection = async (
    input: AddMilkCollectionInput,
  ): Promise<void> => {
    try {
      setLoading(true);

      await addMilkEntryAPI({
        date: input.date,
        shift: input.shift,
        farmerId: input.farmerId,
        milkType: input.milkType,
        quantity: input.liters,
        fat: input.fat,
        snf: input.snf,
        rate: input.rate,
      });

      await reloadAll();
    } catch (error) {
      console.error("Error adding milk entry:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add deduction
  const addDeduction = async (input: AddDeductionInput): Promise<void> => {
    try {
      setLoading(true);

      await addDeductionAPI({
        date: input.date,
        farmerId: input.farmerId,
        category: input.category,
        amount: input.amount,
        description: input.description?.trim() || undefined,
      });

      await reloadAll();
    } catch (error) {
      console.error("Error adding deduction:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AppContextValue = {
    ...state,
    addFarmer,
    addMilkCollection,
    addDeduction,
    reloadAll,
    loading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook to use context
export { AppContext };
