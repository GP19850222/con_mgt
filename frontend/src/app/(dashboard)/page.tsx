'use client';

import React from 'react';
import { useFilters } from '@/components/providers/FilterProvider';
import { useDashboardKPI, useDashboardCharts } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/MetricCard';
import { DashboardCharts } from '@/components/DashboardCharts';
import { ContractGrid } from '@/components/ContractGrid';

export default function DashboardPage() {
  const { filters, unitScale } = useFilters();
  const { kpiData, isLoading: kpiLoading, isError: kpiError } = useDashboardKPI(filters);
  const { chartsData, isLoading: chartsLoading } = useDashboardCharts(filters);

  const formatUSD = (val?: number) => {
    if (val === undefined || val === null) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  const formatVND = (value?: number) => {
    if (value === undefined || value === null) return "0";
    const scaled = value / unitScale;
    const res = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: unitScale === 1 ? 0 : 2,
      maximumFractionDigits: unitScale === 1 ? 0 : 2
    }).format(scaled);
    return `${res} ${unitScale === 1 ? 'VND' : unitScale === 1000000 ? 'Triệu VND' : 'Tỷ VND'}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-6">
      <header className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-1 bg-indigo-600 rounded-full"></div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.3em]">Hệ thống Quản lý</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight font-display mb-3">
          HỆ THỐNG KIỂM SOÁT HỢP ĐỒNG THUÊ TẠI ETOWN CENTRAL
        </h1>
        <p className="text-slate-500 max-w-2xl text-sm md:text-base leading-relaxed">
          Theo dõi tổng hợp về doanh thu hợp đồng, giá thuê & phí dịch vụ tại tòa nhà ETC
        </p>
      </header>

      {kpiError && <p className="text-red-500 bg-red-50 p-4 rounded-md">Lỗi khi tải dữ liệu KPI từ Server. Liên hệ admin - 0977830505.</p>}

      {/* SECTION 1: PRICE STATS (USD/m2) */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display">Giá Thuê & Phí Dịch Vụ</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Đơn vị: USD / m²</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard title="Giá Thuê Cao Nhất" value={formatUSD(kpiData?.rent_stats?.max)} valueColor="text-slate-900" isLoading={kpiLoading} />
          <MetricCard
            title="Giá Thuê Bình Quân"
            value={formatUSD(kpiData?.rent_stats?.avg)}
            valueColor="text-slate-900"
            isLoading={kpiLoading}
            tooltip="(Giá thuê x diện tích) / tổng diện tích"
          />
          <MetricCard title="Giá Thuê Thấp Nhất" value={formatUSD(kpiData?.rent_stats?.min)} valueColor="text-slate-900" isLoading={kpiLoading} />

          <MetricCard title="Phí DV Cao Nhất" value={formatUSD(kpiData?.ser_stats?.max)} valueColor="text-slate-900" isLoading={kpiLoading} />
          <MetricCard
            title="Phí DV Bình Quân"
            value={formatUSD(kpiData?.ser_stats?.avg)}
            valueColor="text-slate-900"
            isLoading={kpiLoading}
            tooltip="(Phí dịch vụ x diện tích) / tổng diện tích"
          />
          <MetricCard title="Phí DV Thấp Nhất" value={formatUSD(kpiData?.ser_stats?.min)} valueColor="text-slate-900" isLoading={kpiLoading} />
        </div>
      </section>

      {/* SECTION 2: REVENUE SUMMARY */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight font-display">Tổng Quan Doanh Thu Dự Kiến</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Đơn vị: {unitScale === 1 ? 'VNĐ' : unitScale === 1000000 ? 'Triệu VNĐ' : 'Tỷ VNĐ'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Tỷ Giá VCB"
            value={kpiData?.fx_rate?.toLocaleString('vi-VN') || "26.355"}
            valueColor="text-indigo-600"
            isLoading={kpiLoading}
            tooltip={`Tỷ giá bán USD được cập nhật từ Vietcombank lúc: ${new Date().toLocaleDateString('vi-VN')}`}
          />
          <MetricCard
            title="D.Thu Thuê Văn phòng"
            value={formatVND(kpiData?.total_rent)}
            valueColor="text-slate-900"
            isLoading={kpiLoading}
          />
          <MetricCard
            title="D.Thu Phí Dịch Vụ cố định"
            value={formatVND(kpiData?.total_ser)}
            valueColor="text-slate-900"
            isLoading={kpiLoading}
          />
          <MetricCard
            title="TỔNG DOANH THU HỢP ĐỒNG THUÊ"
            value={formatVND(kpiData?.total_all)}
            valueColor="text-emerald-600"
            isLoading={kpiLoading}
          />
        </div>
      </section>

      {/* ECharts Section */}
      <div className="pt-8 border-t border-slate-200">
        <DashboardCharts data={chartsData} isLoading={chartsLoading} />
      </div>

      {/* AG Grid Master-Detail Section */}
      <div className="pt-12 border-t border-slate-200">
        <ContractGrid />
      </div>
    </div>
  );
}
