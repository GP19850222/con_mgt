'use client';

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 md:p-12 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-8 h-8 text-indigo-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          Hệ thống Quản lý Hợp đồng
        </h1>
        <p className="text-slate-500 text-sm mb-10">
          Vui lòng đăng nhập bằng tài khoản Google được cấp phép để truy cập Dashboard.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-indigo-500 hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Tiếp tục với Google
        </button>

        <div className="mt-12 pt-8 border-t border-slate-100 italic">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            Bảo mật bởi Google OAuth & NextAuth.js
          </p>
        </div>
      </div>
    </div>
  );
}
