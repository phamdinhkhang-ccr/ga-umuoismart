'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserAccount, UserRole } from '@/types/auth';

export const INITIAL_DEMO_ACCOUNTS: (UserAccount & { password: string })[] = [
  {
    id: 'usr-1',
    username: 'admin',
    password: 'admin123',
    name: 'Nguyễn Văn Admin',
    role: 'SUPER_ADMIN',
  },
  {
    id: 'usr-2',
    username: 'tongdai',
    password: '123456',
    name: 'Trần Thị Tổng Đài',
    role: 'OPERATOR',
  },
  {
    id: 'usr-3',
    username: 'chinhanh1',
    password: '123456',
    name: 'Lê Văn Cơ Sở 1',
    role: 'BRANCH_STAFF',
    branch_id: 'b1111111-1111-1111-1111-111111111111',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 1',
  },
  {
    id: 'usr-4',
    username: 'chinhanh2',
    password: '123456',
    name: 'Phạm Thị Cơ Sở 2',
    role: 'BRANCH_STAFF',
    branch_id: 'b2222222-2222-2222-2222-222222222222',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 3',
  },
];

interface AuthContextType {
  user: UserAccount | null;
  accounts: (UserAccount & { password?: string })[];
  login: (username: string, password: string) => { success: boolean; message?: string; redirectUrl?: string };
  logout: () => void;
  addUserAccount: (newAcc: Omit<UserAccount, 'id'> & { password: string }) => void;
  deleteUserAccount: (id: string) => void;
  isAllowedRoute: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<(UserAccount & { password?: string })[]>(INITIAL_DEMO_ACCOUNTS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('gum_auth_user');
      const storedAccounts = localStorage.getItem('gum_accounts');
      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedAccounts) setAccounts(JSON.parse(storedAccounts));
    } catch (e) {
      console.warn('LocalStorage auth read error', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const login = useCallback((username: string, password: string) => {
    const found = accounts.find(
      (a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
    );

    if (!found) {
      return { success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' };
    }

    const { password: _, ...userNoPass } = found;
    setUser(userNoPass);
    try {
      localStorage.setItem('gum_auth_user', JSON.stringify(userNoPass));
    } catch (e) {}

    let redirectUrl = '/admin/orders';
    if (found.role === 'OPERATOR') redirectUrl = '/admin/create-order';
    if (found.role === 'BRANCH_STAFF') redirectUrl = `/branch/${found.branch_id || 'b1111111-1111-1111-1111-111111111111'}`;
    if (found.role === 'SUPER_ADMIN') redirectUrl = '/admin/orders';

    return { success: true, redirectUrl };
  }, [accounts]);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('gum_auth_user');
    } catch (e) {}
    router.push('/login');
  }, [router]);

  const addUserAccount = useCallback((newAcc: Omit<UserAccount, 'id'> & { password: string }) => {
    const accWithId = {
      ...newAcc,
      id: `usr-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setAccounts((prev) => {
      const updated = [accWithId, ...prev];
      try {
        localStorage.setItem('gum_accounts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const deleteUserAccount = useCallback((id: string) => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('gum_accounts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const isAllowedRoute = useCallback((path: string): boolean => {
    if (!user) {
      return path === '/' || path.startsWith('/track') || path === '/login';
    }

    if (user.role === 'SUPER_ADMIN') return true;

    if (user.role === 'OPERATOR') {
      return path === '/' || path.startsWith('/track') || path.startsWith('/admin/create-order') || path.startsWith('/admin/orders');
    }

    if (user.role === 'BRANCH_STAFF') {
      if (path === '/' || path.startsWith('/track')) return true;
      if (path.startsWith('/branch/')) {
        const routeBranchId = path.split('/branch/')[1]?.split('/')[0];
        return routeBranchId === user.branch_id;
      }
      return false;
    }

    return false;
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;

    const isPublic = pathname === '/' || pathname.startsWith('/track') || pathname === '/login';

    if (!user && !isPublic) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      if (user.role === 'OPERATOR') router.push('/admin/create-order');
      else if (user.role === 'BRANCH_STAFF') router.push(`/branch/${user.branch_id}`);
      else router.push('/admin/orders');
    } else if (user && !isAllowedRoute(pathname)) {
      if (user.role === 'OPERATOR') router.push('/admin/create-order');
      else if (user.role === 'BRANCH_STAFF') router.push(`/branch/${user.branch_id}`);
      else router.push('/admin/orders');
    }
  }, [pathname, user, isLoaded, isAllowedRoute, router]);

  const value = useMemo(() => ({
    user,
    accounts,
    login,
    logout,
    addUserAccount,
    deleteUserAccount,
    isAllowedRoute,
  }), [user, accounts, login, logout, addUserAccount, deleteUserAccount, isAllowedRoute]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
