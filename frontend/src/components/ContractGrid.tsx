'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  ClientSideRowModelModule, 
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CsvExportModule,
  ExternalFilterModule
} from 'ag-grid-community';
import { MasterDetailModule, RowGroupingModule, SetFilterModule, MultiFilterModule } from 'ag-grid-enterprise';
import { Download } from 'lucide-react';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  MasterDetailModule,
  RowGroupingModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CsvExportModule,
  ExternalFilterModule,
  SetFilterModule,
  MultiFilterModule
]);

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { useFilters } from './providers/FilterProvider';
import { useDashboardGrid } from '@/hooks/useDashboardData';

export const ContractGrid = () => {
  const { filters, resetAllFilters } = useFilters();
  const { gridData, isLoading, isError } = useDashboardGrid(filters);
  const [gridApi, setGridApi] = useState<any>(null);

  const onGridReady = useCallback((params: any) => {
    setGridApi(params.api);
  }, []);

  const handleExport = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboard/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(filters)
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_doanh_thu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Lỗi xuất Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại.');
    }
  };

  const handleReset = () => {
    resetAllFilters();
    if (gridApi) {
      gridApi.setFilterModel(null);
    }
  };

  // Cell Renderers for Premium look
  const currencyRenderer = (params: any) => {
    if (params.value === undefined || params.value === null) return "";
    const isTotal = params.colDef.field === 'total_rev';
    const colorClass = isTotal ? "text-indigo-600 font-bold" : "text-slate-600 font-medium";
    return (
      <div className="w-full text-right pr-2">
        <span className={colorClass}>{params.value.toLocaleString('vi-VN')}</span>
      </div>
    );
  };

  const areaRenderer = (params: any) => {
    if (!params.value) return "";
    return (
        <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <span className="font-bold text-slate-700">{params.value.toLocaleString('vi-VN')}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">m²</span>
        </div>
    );
  };

  const floorRenderer = (params: any) => {
    if (!params.value) return "";
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
        <span className="font-semibold text-slate-700">Tầng {params.value}</span>
      </div>
    );
  };

  const dateFormatter = (params: any) => {
    if (!params.value) return "";
    try {
      const date = new Date(params.value);
      if (isNaN(date.getTime())) return params.value;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return params.value;
    }
  };

  const statusRenderer = (params: any) => {
    if (!params.value) return "";
    const isExpired = params.value === 'Hết hạn';
    const badgeClass = isExpired ? "badge-amber" : "badge-green";
    const icon = isExpired ? "⚠️" : "⚡";
    return (
      <span className={`badge-pill ${badgeClass}`}>
        <span className="mr-1.5 opacity-70">{icon}</span>
        {params.value}
      </span>
    );
  };

  return (
    <div className="mt-20 group bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
            <div className="w-2 h-10 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-200"></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">QUẢN LÝ HỢP ĐỒNG</h2>
              <p className="text-slate-400 text-sm mt-1 font-medium">Chi tiết phân bổ doanh thu theo từng giai đoạn</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-xs font-bold text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-2xl border border-indigo-100 uppercase tracking-widest">
              Live Data
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-200 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4" />
            XUẤT EXCEL
          </button>

          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-lg transition-all active:scale-95 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            XÓA LỌC
          </button>
        </div>
      </div>
      
      <div className="ag-theme-quartz w-full" style={{ height: 700 }}>
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <div className="text-slate-400 font-bold">Đang tải dữ liệu...</div>
          </div>
        ) : isError ? (
          <div className="h-full flex items-center justify-center bg-red-50 text-red-500 rounded-2xl font-bold border border-red-100">
            ❌ Lỗi không thể tải Master-Detail Grid
          </div>
        ) : (
          <AgGridReact
            rowData={gridData || []}
            onGridReady={onGridReady}
            masterDetail={true}
            detailRowAutoHeight={true}
            animateRows={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            getRowHeight={(params: any) => {
              if (params.node.group) {
                const text = params.node.key || "";
                // Ước tính số dòng: trung bình ~60 ký tự mỗi dòng cho chiều rộng 400px
                const charsPerLine = 60;
                const lineCount = Math.max(1, Math.ceil(text.length / charsPerLine));
                return lineCount === 1 ? 52 : lineCount * 26 + 12; // 24px per line + padding
              }
              return 52;
            }}
            defaultColDef={{
              flex: 1,
              resizable: true,
              filter: true,
              floatingFilter: true,
              sortable: true,
              headerClass: 'font-bold text-xs uppercase tracking-widest text-slate-500'
            }}
            columnDefs={[
              { 
                field: 'short_name_customer', 
                headerName: 'Khách hàng / Hợp đồng', 
                hide: true, 
                rowGroup: true 
              },
              { field: 'floor', headerName: 'Vị trí', cellRenderer: floorRenderer, maxWidth: 140 },
              { field: 'area', headerName: 'Diện tích', cellRenderer: areaRenderer, maxWidth: 160 },
              { field: 'rent_rev', headerName: 'Doanh thu thuê', cellRenderer: currencyRenderer, aggFunc: 'sum' },
              { field: 'ser_rev', headerName: 'Phí dịch vụ', cellRenderer: currencyRenderer, aggFunc: 'sum' },
              { field: 'total_rev', headerName: 'Tổng cộng', cellRenderer: currencyRenderer, aggFunc: 'sum' },
              { field: 'expire', headerName: 'Trạng thái', cellRenderer: statusRenderer, maxWidth: 160 },
              { 
                field: 'expired_date', 
                headerName: 'Hết hạn', 
                maxWidth: 140, 
                valueFormatter: dateFormatter,
                cellStyle: { color: '#94a3b8', fontSize: '12px', fontWeight: '500' } 
              }
            ]}
            autoGroupColumnDef={{
              headerName: 'TÊN KHÁCH HÀNG / SỐ HĐ',
              field: 'short_name_customer',
              minWidth: 400,
              wrapText: true,
              autoHeight: true,
              cellRenderer: 'agGroupCellRenderer',
              cellRendererParams: { 
                suppressCount: true,
                innerRenderer: (params: any) => (
                  <div className="leading-normal py-1 pr-4 whitespace-normal font-bold text-slate-800">
                    {params.value}
                  </div>
                )
              }
            }}
            detailCellRendererParams={{
              detailGridOptions: {
                columnDefs: [
                  { headerName: 'TỪ NGÀY', field: 'beg_effect_price', maxWidth: 130, valueFormatter: dateFormatter },
                  { headerName: 'ĐẾN NGÀY', field: 'end_effect_price', maxWidth: 130, valueFormatter: dateFormatter },
                  { headerName: 'GIÁ THUÊ', field: 'rent_price', cellRenderer: currencyRenderer },
                  { headerName: 'PHÍ DV', field: 'ser_price', cellRenderer: currencyRenderer },
                  { headerName: 'D.T THUÊ', field: 'rent_rev', cellRenderer: currencyRenderer },
                  { headerName: 'D.T PHÍ DV', field: 'ser_rev', cellRenderer: currencyRenderer },
                  { headerName: 'TỔNG CỘNG', field: 'total_rev', cellRenderer: currencyRenderer }
                ],
                defaultColDef: { 
                  flex: 1, 
                  resizable: true,
                  headerClass: 'bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter'
                },
                domLayout: 'autoHeight',
                rowHeight: 48
              },
              getDetailRowData: (params: any) => {
                if (params.data && params.data.details) {
                  let parsed = [];
                  try {
                    parsed = typeof params.data.details === 'string' ? JSON.parse(params.data.details) : params.data.details;
                  } catch (e) {
                    parsed = [];
                  }
                  params.successCallback(parsed);
                } else {
                  params.successCallback([]);
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
