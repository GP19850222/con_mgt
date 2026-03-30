'use client';

import React from 'react';
import { FileBarChart2, X } from 'lucide-react';
import { useFilters } from './providers/FilterProvider';
import { useDashboardFilters } from '@/hooks/useDashboardData';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { filters, setFilters, unitScale, setUnitScale, resetInteractiveFilters, resetAllFilters } = useFilters();
  const { filterOptions, isLoading: filtersLoading } = useDashboardFilters();
  const [custSearch, setCustSearch] = React.useState('');

  const hasInitializedFloors = React.useRef(false);

  React.useEffect(() => {
    if (!filtersLoading && filterOptions?.floors?.length && !hasInitializedFloors.current) {
        setFilters((prev: any) => ({
            ...prev,
            selected_floors: filterOptions.floors
        }));
        hasInitializedFloors.current = true;
    }
  }, [filterOptions, filtersLoading, setFilters]);

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnitScale(Number(e.target.value));
  };

  const setMultiSelect = (type: 'selected_customers' | 'selected_floors', val: string) => {
    setFilters((prev: any) => {
        const arr = prev[type] || [];
        const next = arr.includes(val) ? arr.filter((x: any) => x !== val) : [...arr, val];
        return { ...prev, [type]: next };
    });
  };

  const handleDateChange = (type: 'start_date' | 'end_date', val: string) => {
    setFilters(prev => ({ ...prev, [type]: val || null }));
  };

  const hasAnyFilters = 
    filters.start_date !== null ||
    filters.end_date !== null ||
    filters.selected_customers.length > 0 ||
    filters.selected_floors.length > 0 ||
    filters.sel_years.length > 0 || 
    filters.sel_months.length > 0 || 
    filters.sel_custs.length > 0 || 
    filters.sel_floors.length > 0 || 
    filters.sel_rev_type.length > 0;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200 p-6 overflow-y-auto flex flex-col shadow-xl lg:shadow-none z-50
        transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileBarChart2 className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">QL Hợp Đồng</h2>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 focus:bg-slate-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

      <div className="space-y-6 flex-1">
        {/* Đơn vị tính */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">💰 Đơn vị tính</label>
          <select 
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={unitScale}
            onChange={handleUnitChange}
          >
            <option value={1}>VNĐ</option>
            <option value={1000000}>Triệu VNĐ</option>
            <option value={1000000000}>Tỷ VNĐ</option>
          </select>
        </div>

        <hr className="border-slate-200" />

        {/* Thời gian */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">📅 Lọc Thời Gian</label>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-500 mb-1 block">Từ ngày</span>
              <input 
                type="date" 
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={filters.start_date || ''}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <span className="text-xs text-slate-500 mb-1 block">Đến ngày</span>
              <input 
                type="date" 
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={filters.end_date || ''}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Khách hàng */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest">🏢 Nhóm Khách Hàng</label>
          <div className="relative group/search">
            <input 
              type="text"
              placeholder="Tìm nhanh..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs mb-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
            />
          </div>
          {filtersLoading ? (
            <div className="animate-pulse space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-4 bg-slate-100 rounded"></div>)}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50/30">
              {filterOptions?.customers
                .filter(c => c.toLowerCase().includes(custSearch.toLowerCase()))
                .map(cust => (
                <label key={cust} className="flex items-start gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors group">
                   <input 
                     type="checkbox" 
                     className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                     checked={filters.selected_customers.includes(cust)}
                     onChange={() => setMultiSelect('selected_customers', cust)}
                   />
                   <span className="text-[11px] text-slate-600 leading-tight break-words whitespace-normal group-hover:text-indigo-700 font-medium">{cust}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <hr className="border-slate-200" />

        {/* Tầng */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">🏗️ Lọc theo Tầng</label>
            {!filtersLoading && filterOptions?.floors?.length && (
              <button 
                onClick={() => {
                  const currentFloors = filterOptions?.floors || [];
                  const allSelected = filters.selected_floors.length === currentFloors.length;
                  setFilters((prev: any) => ({
                    ...prev,
                    selected_floors: allSelected ? [] : currentFloors
                  }));
                }}
                className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider"
              >
                {filters.selected_floors.length === (filterOptions?.floors?.length || 0) ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
            )}
          </div>
          {filtersLoading ? (
            <div className="animate-pulse space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-4 bg-slate-100 rounded"></div>)}
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 grid grid-cols-3 gap-1 bg-slate-50/30">
              {filterOptions?.floors.map(fl => (
                <label key={fl} className="flex items-center gap-1.5 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                   <input 
                     type="checkbox" 
                     className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                     checked={filters.selected_floors.includes(fl)}
                     onChange={() => setMultiSelect('selected_floors', fl)}
                   />
                   <span className="text-[10px] text-slate-500 group-hover:text-indigo-600 font-semibold">{fl}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasAnyFilters && (
        <div className="mt-8 pt-4 border-t border-slate-200 pb-10">
          <p className="text-sm font-medium text-amber-600 mb-3 text-center animate-pulse">🔍 Đang áp dụng bộ lọc</p>
          <button 
            onClick={() => {
                resetAllFilters();
                setCustSearch('');
            }}
            className="w-full bg-slate-900 text-white rounded-md py-3 text-sm font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
          >
            🔄 Reset Toàn Bộ Bộ Lọc
          </button>
        </div>
      )}
      </aside>
    </>
  );
};
