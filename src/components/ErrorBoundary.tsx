'use client';
import React from 'react';

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  private timer: any = null;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Captured by GlobalErrorBoundary:', error, errorInfo);
    // Auto recovery attempt after 2 seconds if transient error
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.setState({ hasError: false });
    }, 2000);
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 space-y-4">
            <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Đang kết nối lại hệ thống</h2>
            <p className="text-slate-500 text-sm">Trang web đang đồng bộ dữ liệu phiên làm việc mới.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Thử Lại Ngay
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tải Lại Trang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
