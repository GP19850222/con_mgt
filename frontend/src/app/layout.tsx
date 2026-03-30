import React from 'react';
import { Inter, Be_Vietnam_Pro } from 'next/font/google';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800', '900'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-be-vietnam-pro',
});

export const metadata = {
  title: 'Contract Management Dashboard',
  description: 'Báo cáo doanh thu hợp đồng ETC',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${inter.variable} ${beVietnamPro.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
