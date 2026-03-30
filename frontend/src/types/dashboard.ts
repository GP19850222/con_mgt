export interface FilterParams {
  start_date: string | null;
  end_date: string | null;
  selected_customers: string[];
  selected_floors: string[];
  sel_years: number[];
  sel_months: string[];
  sel_custs: string[];
  sel_floors: string[];
  sel_rev_type: string[];
}

export interface KPIData {
  total_rent: number;
  total_ser: number;
  total_all: number;
  rent_stats: { max: number; avg: number; min: number };
  ser_stats: { max: number; avg: number; min: number };
  fx_rate: number;
}

export interface ChartsData {
  yearly_revenue: { year: number; total_rev: number }[];
  monthly_revenue: { month_year_sort: string; total_rev: number }[];
  top_customers: { short_name: string; rent_rev: number; ser_rev: number; total: number }[];
  revenue_structure: { rent: number; service: number };
  floor_donut: { floor: string; total_rev: number }[];
  floor_dist: { short_name: string; customer: string; floor: string; area: number; rental_usd: number; service_usd: number; total_usd: number; normalized_sqr: number }[];
  max_rent_usd: number;
}
