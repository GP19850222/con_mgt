'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  textColor?: string;
  valueColor?: string;
  isLoading?: boolean;
  tooltip?: string;
}

export const MetricCard = ({ 
  title, 
  value, 
  textColor = "text-slate-500", 
  valueColor = "text-slate-900",
  isLoading = false,
  tooltip
}: MetricCardProps) => {

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm animate-pulse flex flex-col items-center justify-center">
        <div className="h-3 bg-slate-100 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-slate-100 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:shadow-md hover:border-indigo-200 transition-all group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <h3 className={`text-[10px] md:text-xs font-bold mb-3 uppercase tracking-[0.15em] flex items-center gap-1.5 ${textColor}`}>
        {title}
        {tooltip && (
          <span 
            title={tooltip} 
            className="cursor-help text-slate-300 hover:text-indigo-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
        )}
      </h3>
      <p className={`text-xl md:text-2xl lg:text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
    </div>
  );
};
