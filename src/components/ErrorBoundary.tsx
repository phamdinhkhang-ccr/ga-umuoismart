'use client';
import React from 'react';

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Captured by GlobalErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Đang kết nối lại hệ thống</h2>
            <p className="text-slate-500 text-sm mb-6">Trang web đang đồng bộ dữ liệu phiên làm việc mới.</p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.clear();
                  } catch (e) {}
                  window.location.reload();
                }
              }}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition"
            >
              Làm Mới & Tiếp Tục
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
