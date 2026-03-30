'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FilterParams } from '@/types/dashboard';

interface FilterContextType {
  filters: FilterParams;
  setFilters: React.Dispatch<React.SetStateAction<FilterParams>>;
  unitScale: number;
  setUnitScale: (scale: number) => void;
  resetInteractiveFilters: () => void;
  resetAllFilters: () => void;
}

const defaultFilters: FilterParams = {
  start_date: null,
  end_date: null,
  selected_customers: [],
  selected_floors: [],
  sel_years: [],
  sel_months: [],
  sel_custs: [],
  sel_floors: [],
  sel_rev_type: [],
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<FilterParams>(defaultFilters);
  const [unitScale, setUnitScale] = useState<number>(1); // 1 = VNĐ, 1000000 = Triệu

  const resetInteractiveFilters = () => {
    setFilters(prev => ({
      ...prev,
      sel_years: [],
      sel_months: [],
      sel_custs: [],
      sel_floors: [],
      sel_rev_type: [],
    }));
  };

  const resetAllFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <FilterContext.Provider 
      value={{ filters, setFilters, unitScale, setUnitScale, resetInteractiveFilters, resetAllFilters }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
};
