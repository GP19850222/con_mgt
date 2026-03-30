'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { FilterProvider } from '@/components/providers/FilterProvider';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <FilterProvider>
      <div className="flex bg-slate-50 min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 font-bold text-slate-800">QL Doanh Thu</span>
        </div>

        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Main Content */}
        <main className="flex-1 lg:ml-72 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto transition-all duration-300">
          {children}
        </main>
      </div>
    </FilterProvider>
  );
}
