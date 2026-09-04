'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import CustomerChatWidget from '@/components/CustomerChatWidget';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

function ClientOnlyWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-slate-50 font-sans">{children}</div>;
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full bg-slate-50 scroll-smooth">
      <body className={`${inter.className} min-h-screen text-slate-900 bg-slate-50 antialiased overflow-x-hidden`}>
        <AuthProvider>
          <ClientOnlyWrapper>
            <AppShell>{children}</AppShell>
          </ClientOnlyWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrBranch = pathname.startsWith('/admin') || pathname.startsWith('/branch');

  if (isAdminOrBranch && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500 text-xs font-bold p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-md">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang kiểm tra phiên đăng nhập...</span>
        </div>
      </div>
    );
  }

  if (!isAdminOrBranch) {
    return (
      <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden relative font-sans">
        {children}
        <CustomerChatWidget />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 w-full overflow-x-hidden relative">
      {/* Sidebar Component (Desktop Fixed + Mobile Drawer Overlay) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area (Right) */}
      <div className="flex-1 flex flex-col min-w-0 w-full bg-slate-50 min-h-screen overflow-x-hidden">
        <Topbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* AI Customer Support Floating Chatbot Widget (Bottom-Right) */}
      <CustomerChatWidget />
    </div>
  );
}
