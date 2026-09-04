'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import CustomerChatWidget from '@/components/CustomerChatWidget';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full bg-slate-50 scroll-smooth">
      <body className={`${inter.className} min-h-screen text-slate-900 bg-slate-50 antialiased overflow-x-hidden`}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminOrBranch = pathname.startsWith('/admin') || pathname.startsWith('/branch');

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
