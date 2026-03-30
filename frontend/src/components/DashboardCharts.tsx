'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useFilters } from './providers/FilterProvider';
import { ChartsData } from '@/types/dashboard';

interface DashboardChartsProps {
  data?: ChartsData;
  isLoading: boolean;
}

export const DashboardCharts = ({ data, isLoading }: DashboardChartsProps) => {
  const { filters, setFilters, unitScale } = useFilters();

  // Helper formats numbers
  const formatNum = (val: number, isUSD = false) => {
    if (isUSD) return "$" + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const scaled = val / unitScale;
    const decimals = unitScale === 1 ? 0 : 2;
    return scaled.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // ===============================
  // CHART 1: DOANH THU THEO NĂM (BAR)
  // ===============================
  const optYear = useMemo(() => {
    if (!data) return {};
    const years = data.yearly_revenue.map(d => String(d.year));
    const revs = data.yearly_revenue.map(d => d.total_rev / unitScale);
    
    // Xử lý opacity cho selected point
    const barData = data.yearly_revenue.map(d => ({
      value: d.total_rev / unitScale,
      itemStyle: {
        color: (!filters.sel_years.length || filters.sel_years.includes(d.year)) ? "#3b82f6" : "rgba(59,130,246,0.22)",
        borderRadius: [4, 4, 0, 0]
      }
    }));

    return {
      title: { text: "💰 Doanh thu năm", left: "center", textStyle: { fontSize: 18, color: "#334155" } },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#e2e8f0", borderWidth: 1,
        valueFormatter: (v: number) => v ? v.toLocaleString('vi-VN') : '0'
      },
      grid: { left: "3%", right: "4%", bottom: "5%", containLabel: true },
      xAxis: { type: "category", data: years, axisLine: { lineStyle: { color: "#94a3b8" } } },
      yAxis: { type: "value", name: "D.Thu", splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } }, axisLabel: { formatter: (v: number) => v.toLocaleString('vi-VN') } },
      series: [{ name: "Doanh thu", type: "bar", barWidth: "50%", data: barData }]
    };
  }, [data, filters.sel_years, unitScale]);

  // ===============================
  // CHART 2: DOANH THU THÁNG (LINE AREA)
  // ===============================
  const optMonth = useMemo(() => {
    if (!data) return {};
    const months = data.monthly_revenue.map(d => d.month_year_sort);
    
    const lineData = data.monthly_revenue.map(d => ({
      value: d.total_rev / unitScale,
      itemStyle: { color: (!filters.sel_months.length || filters.sel_months.includes(d.month_year_sort)) ? "#f59e0b" : "rgba(245,158,11,0.25)" }
    }));

    return {
      title: { text: "📈 Doanh thu theo Tháng", left: "center", textStyle: { fontSize: 18, color: "#334155" } },
      tooltip: {
        trigger: "axis", axisPointer: { type: "cross" },
        backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#e2e8f0", borderWidth: 1,
        valueFormatter: (v: number) => v ? v.toLocaleString('vi-VN') : '0'
      },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { type: "category", data: months, axisLabel: { rotate: 45, color: "#64748b" }, boundaryGap: false },
      yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } }, axisLabel: { formatter: (v: number) => v.toLocaleString('vi-VN') } },
      series: [{
        name: "Doanh thu", type: "line", smooth: true, symbol: "circle", symbolSize: 8,
        data: lineData, lineStyle: { color: "#f59e0b", width: 2 },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(245,158,11,0.50)" }, { offset: 1, color: "rgba(245,158,11,0.05)" }]
          }
        }
      }]
    };
  }, [data, filters.sel_months, unitScale]);

  // ===============================
  // CHART 3: TOP KHÁCH HÀNG (STACKED BAR)
  // ===============================
  const optCustomer = useMemo(() => {
    if (!data) return {};
    const cNames = data.top_customers.map(d => d.short_name);
    
    const rentData = data.top_customers.map(d => ({
      value: d.rent_rev / unitScale,
      itemStyle: { opacity: (!filters.sel_custs.length || filters.sel_custs.includes(d.short_name)) ? 1 : 0.25 }
    }));
    const serData = data.top_customers.map(d => ({
      value: d.ser_rev / unitScale,
      itemStyle: { opacity: (!filters.sel_custs.length || filters.sel_custs.includes(d.short_name)) ? 1 : 0.25 }
    }));

    return {
      title: { text: "🏆 Doanh thu theo khách hàng", textStyle: { fontSize: 16 } },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#e2e8f0", borderWidth: 1,
        valueFormatter: (v: number) => v ? v.toLocaleString('vi-VN') : '0'
      },
      legend: { data: ["Thuê Cơ Bản", "Phí Dịch Vụ"], top: "bottom" },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: { 
        type: "value", 
        name: "D.Thu", 
        splitNumber: 4, // Giảm số lượng tick để tránh chồng lấn
        splitLine: { show: true, lineStyle: { type: "dashed" } }, 
        axisLabel: { 
          formatter: (v: number) => {
            if (v >= 1000000) return (v / 1000000).toFixed(0) + " tr";
            if (v >= 1000) return (v / 1000).toFixed(0) + " k";
            return v.toLocaleString('vi-VN');
          },
          fontSize: 10,
          color: "#64748b"
        } 
      },
      yAxis: { type: "category", data: cNames, axisLabel: { fontWeight: "bold", color: "#475569" } },
      series: [
        { name: "Thuê Cơ Bản", type: "bar", stack: "total", itemStyle: { color: "#6366f1" }, data: rentData },
        { name: "Phí Dịch Vụ", type: "bar", stack: "total", itemStyle: { color: "#14b8a6", borderRadius: [0, 6, 6, 0] }, data: serData }
      ]
    };
  }, [data, filters.sel_custs, unitScale]);

  // ===============================
  // CHART 4: PHÂN BỔ DIỆN TÍCH THEO TẦNG (VISUAL MAP)
  // ===============================
  const optFloorDist = useMemo(() => {
    if (!data || !data.floor_dist.length) return {};
    
    const existFloors = Array.from(new Set(data.floor_dist.map(d => String(d.floor))));
    const CUSTOM_FLOOR_SORT_ORDER = ["27", "26", "25", "24", "23", "22", "21", "20", "19", "18", "17", "16", "15", "14", "12", "11", "10", "09", "08", "07", "06", "05", "03", "02", "01", "G"];
    const sortedFloors = existFloors.sort((a, b) => {
      const idxA = CUSTOM_FLOOR_SORT_ORDER.indexOf(a);
      const idxB = CUSTOM_FLOOR_SORT_ORDER.indexOf(b);
      return (idxA > -1 ? idxA : 999) - (idxB > -1 ? idxB : 999);
    });

    const maxRentUsd = data.max_rent_usd || 1;
    const seriesList: any[] = [];
    
    // Helper function JavaScript map màu (từ code custom python) - nhưng ECharts có visualMap nội tại hỗ trợ trực tiếp.
    // Dữ liệu từ Python gửi lên từng cụm bar nhỏ của short_name.
    data.floor_dist.forEach(row => {
      const f_str = String(row.floor);
      const f_idx = sortedFloors.indexOf(f_str);
      const dataArr = new Array(sortedFloors.length).fill("-");
      
      let opac = 1.0;
      if ((filters.sel_custs.length && !filters.sel_custs.includes(row.short_name)) || 
          (filters.sel_floors.length && !filters.sel_floors.includes(f_str))) {
        opac = 0.2;
      }
      
      dataArr[f_idx] = {
        value: row.normalized_sqr,
        actualVal: row.rental_usd, // visualMap sẽ map màu theo cái này thông qua dimension 2 
        // Fake array for dimension: [x, y, value_for_color]
        // Actually, in stacked bar, visual map by dimension doesn't work well out of the box per series item without dataset. 
        // So we will use the exact logic: ECharts dimension mapping:
        tooltip_area: row.customer === 'Filtered' ? 'Filtered' : (row.customer === 'Trống' ? 'Trống' : row.area),
        tooltip_rent: row.rental_usd >= 0 ? row.rental_usd : 0,
        tooltip_ser: row.service_usd >= 0 ? row.service_usd : 0,
        tooltip_total: row.total_usd >= 0 ? row.total_usd : 0
      };

      // JS Color map (port từ python)
      function getColor(val: number, maxV: number, name: string) {
        if (name === 'Filtered') return '#e2e8f0'; // Light grey for filtered
        if (name === 'Trống') return '#0a0a0a';   // Black for truly empty
        
        // Ensure val and maxV are numbers
        const v = Number(val) || 0;
        const mV = Number(maxV) || 1;
        
        if (v <= 0) return '#0a0a0a';
        
        let t = mV > 0 ? v / mV : 0;
        t = Math.max(0, Math.min(1, t));
        
        // Spectrum: Black (0) -> Blue (0.33) -> Yellow (0.66) -> Green (1.0)
        // Adjust: Ensure minimum visible color isn't pure black for occupied spaces
        const stops = ['#0a0a0a', '#3b82f6', '#fbbf24', '#22c55e'];
        const numSeg = stops.length - 1;
        const scaledT = t * numSeg;
        const idx = Math.floor(scaledT);
        
        if (idx >= numSeg) return stops[stops.length - 1];
        
        const localT = scaledT - idx;
        
        const hexToRgb = (h: string) => [
          parseInt(h.slice(1,3), 16), 
          parseInt(h.slice(3,5), 16), 
          parseInt(h.slice(5,7), 16)
        ];
        const rgbToHex = (r: number, g: number, b: number) => 
          '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
          
        const [r1, g1, b1] = hexToRgb(stops[idx]);
        const [r2, g2, b2] = hexToRgb(stops[idx + 1]);
        
        return rgbToHex(
          r1 + (r2 - r1) * localT, 
          g1 + (g2 - g1) * localT, 
          b1 + (b2 - b1) * localT
        );
      }
      
      const cVal = getColor(row.rental_usd, maxRentUsd, row.short_name);

      seriesList.push({
        name: row.short_name,
        type: "bar",
        stack: "total",
        barWidth: "90%",
        data: dataArr,
        itemStyle: { 
          color: cVal, 
          borderColor: "#fff", 
          borderWidth: 0.5, 
          opacity: row.short_name === 'Filtered' ? 0.4 : opac 
        },
        emphasis: { itemStyle: { borderColor: "red", borderWidth: 2 } }
      });
    });

    // Dummy cho legend
    seriesList.push({
      type: "scatter", name: "dummy_visualMap",
      data: [[0, 0, 0], [0, 0, maxRentUsd]],
      symbolSize: 0, itemStyle: { opacity: 0 }, tooltip: { show: false }
    });

    return {
      title: { text: "🏢 Phân Bổ Diện Tích Thuê theo Tầng", textStyle: { fontSize: 16 } },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)", borderColor: "#e2e8f0", borderWidth: 1,
        formatter: (params: any) => {
          const d = params.data;
          if (!d || d.value === 0 || d.value === "-") return '';
          if (d.tooltip_area === 'Filtered') return `<b>Tầng:</b> ${params.name}<br/>Không nằm trong bộ lọc`;
          const areaStr = d.tooltip_area === 'Trống' ? 'Nguyên tầng' : d.tooltip_area.toLocaleString('vi-VN') + ' m²';
          return `<b>Khách thuê:</b> ${params.seriesName}<br/><b>Tầng:</b> ${params.name}<br/><b>Diện tích:</b> ${areaStr}<br/><b>Giá thuê:</b> $${d.tooltip_rent.toFixed(2)}<br/><b>Phí DV:</b> $${d.tooltip_ser.toFixed(2)}<br/><b>Tổng cộng:</b> $${d.tooltip_total.toFixed(2)}`;
        }
      },
      visualMap: {
        type: "continuous", min: 0, max: maxRentUsd > 0 ? maxRentUsd : 30,
        calculable: true, orient: "horizontal", left: "center", bottom: "0%", dimension: 2,
        seriesIndex: seriesList.length - 1,
        inRange: { color: ['#0a0a0a', '#3b82f6', '#fbbf24', '#22c55e'] },
        text: ["Cao", "Thấp"],
        padding: [0, 0, 10, 0],
        itemWidth: 15,
        itemHeight: 250,
        formatter: (v: number) => `$${v.toFixed(2)}`,
        textStyle: { fontSize: 10, color: "#94a3b8" }
      },
      grid: { left: "3%", right: "5%", bottom: "18%", containLabel: true },
      xAxis: { type: "value", max: 1, axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { type: "category", data: sortedFloors, axisLabel: { fontWeight: "bold" }, inverse: true },
      series: seriesList
    };
  }, [data, filters.sel_floors, filters.sel_custs]);

  // ===============================
  // CHART 5.1 & 5.2: DONUT & PIE 
  // ===============================
  const optDonut = useMemo(() => {
    if (!data) return {};
    const pieData = data.floor_donut.map(d => ({
      name: d.floor,
      value: d.total_rev / unitScale,
      itemStyle: { opacity: (!filters.sel_floors.length || filters.sel_floors.includes(d.floor)) ? 1 : 0.25 }
    }));
    return {
      title: { text: "Doanh Thu Theo Tầng", left: "center", textStyle: { fontSize: 16 } },
      tooltip: {
        trigger: "item",
        formatter: (p: any) => `<b>Tầng ${p.name}</b><br/>Doanh Thu: <b>${p.value.toLocaleString('vi-VN')}</b><br/>Tỷ trọng: <b>${p.percent.toFixed(1)}%</b>`
      },
      legend: { orient: "vertical", left: "left", type: "scroll" },
      series: [{
        name: "Tầng", type: "pie", radius: ["40%", "70%"], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: "#fff", borderWidth: 2 },
        label: { show: false, position: "center" },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: "bold", formatter: "Tầng {b}\n{d}%" } },
        labelLine: { show: false }, data: pieData
      }]
    };
  }, [data, filters.sel_floors, unitScale]);

  const optPie = useMemo(() => {
    if (!data) return {};
    const stRent = data.revenue_structure.rent / unitScale;
    const stSer = data.revenue_structure.service / unitScale;
    
    const pieData = [
      { name: "Thuê VP Cơ Bản", value: stRent, itemStyle: { color: "#6366f1", opacity: (!filters.sel_rev_type.length || filters.sel_rev_type.includes("Thuê VP Cơ Bản")) ? 1 : 0.25 } },
      { name: "Phí Dịch Vụ Mở Rộng", value: stSer, itemStyle: { color: "#14b8a6", opacity: (!filters.sel_rev_type.length || filters.sel_rev_type.includes("Phí Dịch Vụ Mở Rộng")) ? 1 : 0.25 } }
    ];
    
    return {
      title: { text: "Cơ Cấu Nguồn Thu", left: "center", textStyle: { fontSize: 16 } },
      tooltip: {
        trigger: "item",
        formatter: (p: any) => `<b>${p.name}</b><br/>Doanh Thu: <b>${p.value.toLocaleString('vi-VN')}</b><br/>Tỷ trọng: <b>${p.percent.toFixed(1)}%</b>`
      },
      legend: { bottom: 0, left: "center" },
      series: [{
        name: "Cấu trúc doanh thu", type: "pie", radius: "65%", center: ["50%", "50%"],
        itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
        data: pieData,
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } }
      }]
    };
  }, [data, filters.sel_rev_type, unitScale]);

  // Handle Event Clicks
  const toggleSelect = (type: keyof typeof filters, val: string | number) => {
    setFilters((prev: any) => {
        const arr: any[] = prev[type];
        return {
            ...prev,
            [type]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
        };
    });
  };

  if (!data && isLoading) {
    return <div className="animate-pulse h-96 bg-slate-200 rounded-xl w-full flex items-center justify-center">Đang nạp dữ liệu khởi tạo...</div>;
  }

  if (!data) return null;

  return (
    <div className={`space-y-8 mt-10 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <ReactECharts option={optYear} onEvents={{ click: (e: any) => toggleSelect('sel_years', parseInt(e.name)) }} style={{ height: 400 }} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <ReactECharts option={optMonth} onEvents={{ click: (e: any) => toggleSelect('sel_months', e.name) }} style={{ height: 400 }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           {optFloorDist.series ? <ReactECharts option={optFloorDist} onEvents={{ click: (e: any) => toggleSelect('sel_custs', e.seriesName) }} style={{ height: 600 }} /> : <div>Không có data phân bổ tầng</div>}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <ReactECharts option={optCustomer} onEvents={{ click: (e: any) => toggleSelect('sel_custs', e.name) }} style={{ height: 600 }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <ReactECharts option={optDonut} onEvents={{ click: (e: any) => toggleSelect('sel_floors', e.name) }} style={{ height: 400 }} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
           <ReactECharts option={optPie} onEvents={{ click: (e: any) => toggleSelect('sel_rev_type', e.name) }} style={{ height: 400 }} />
        </div>
      </div>
    </div>
  );
};
