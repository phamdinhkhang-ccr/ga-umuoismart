'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BranchIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Default redirect to Chi Nhánh Quận 1
    router.replace('/branch/b1111111-1111-1111-1111-111111111111');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-700">Đang tự động chuyển hướng về Chi Nhánh Mặc Định...</span>
      </div>
    </div>
  );
}
