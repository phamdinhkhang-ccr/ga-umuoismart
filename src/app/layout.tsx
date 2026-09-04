import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Gà Ủ Muối Smart - Hệ Thống Vận Hành Bán Hàng Đa Chi Nhánh',
  description: 'Hệ thống tự động hóa bán hàng đa chi nhánh gà ủ muối bằng AI & Supabase Realtime.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full bg-slate-50">
      <body className={`${inter.className} min-h-screen text-slate-900 bg-slate-50 antialiased`}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Vertical Sidebar (w-64) */}
      <Sidebar />

      {/* Main Content Area (Right) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        <Topbar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
