import useSWR from 'swr';
import api from '@/lib/axios';
import { FilterParams, KPIData } from '@/types/dashboard';

const fetcherObj = (url: string, filters: FilterParams) =>
  api.post(url, filters).then((res) => res.data);

const fetcherGet = (url: string) => api.get(url).then((res) => res.data);

export const useDashboardFilters = () => {
  const { data, error, isLoading } = useSWR<{ customers: string[], floors: string[] }>(
    '/api/dashboard/filters',
    fetcherGet,
    { revalidateOnFocus: false }
  );
  return { filterOptions: data, isLoading, isError: error };
};

export const useDashboardKPI = (filters: FilterParams) => {
  const { data, error, isLoading } = useSWR<KPIData>(
    ['/api/dashboard/kpi', filters],
    ([url, flt]) => fetcherObj(url, flt as FilterParams),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return { kpiData: data, isLoading, isError: error };
};

export const useDashboardCharts = (filters: FilterParams) => {
  const { data, error, isLoading } = useSWR<any>(
    ['/api/dashboard/charts', filters],
    ([url, flt]) => fetcherObj(url, flt as FilterParams),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return { chartsData: data, isLoading, isError: error };
};

export const useDashboardGrid = (filters: FilterParams) => {
  const { data, error, isLoading } = useSWR<any[]>(
    ['/api/dashboard/grid', filters],
    ([url, flt]) => fetcherObj(url, flt as FilterParams),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return { gridData: data, isLoading, isError: error };
};
