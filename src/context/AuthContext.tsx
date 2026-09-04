'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserAccount } from '@/types/auth';
import { safeGetJSON } from '@/utils/storage';

export const INITIAL_DEMO_ACCOUNTS: (UserAccount & { password?: string })[] = [
  {
    id: 'usr-1',
    username: 'admin',
    password: 'admin123',
    name: 'Nguyễn Văn Admin',
    role: 'SUPER_ADMIN',
    phone: '0988.123.456',
    status: 'ACTIVE',
    email: 'admin@gaumuoismart.vn',
    dob: '08/04/1992',
    id_card: '001092001234',
    position: 'Quản Trị Viên Tối Cao',
    date_joined: '01/01/2025',
    last_active: '2026-09-04 19:55',
    orders_count: 1420,
    shifts_count: 180,
    hourly_rate: 40000,
    commission_per_order: 3000,
    permissions: {
      can_view_revenue: true,
      can_create_expense: true,
      can_cancel_order: true,
      can_edit_price: true
    },
    branch_name: 'Toàn Chuỗi / Tất Cả'
  },
  {
    id: 'usr-2',
    username: 'tongdai',
    password: '123456',
    name: 'Trần Thị Tổng Đài',
    role: 'OPERATOR',
    phone: '0977.888.999',
    status: 'ACTIVE',
    email: 'tongdai@gaumuoismart.vn',
    dob: '15/09/1998',
    id_card: '001098005678',
    position: 'Trưởng Ca Tổng Đài Lên Đơn',
    date_joined: '15/03/2025',
    last_active: '2026-09-04 19:40',
    orders_count: 850,
    shifts_count: 95,
    hourly_rate: 28000,
    commission_per_order: 2000,
    permissions: {
      can_view_revenue: true,
      can_create_expense: true,
      can_cancel_order: fontCancelOrderDefault(true),
      can_edit_price: false
    },
    branch_name: 'Trung Tâm Điều Phối'
  },
  {
    id: 'usr-3',
    username: 'chinhanh1',
    password: '123456',
    name: 'Lê Văn Cơ Sở 1',
    role: 'BRANCH_STAFF',
    phone: '0283.811.1111',
    status: 'ACTIVE',
    email: 'quan1@gaumuoismart.vn',
    dob: '20/11/1995',
    id_card: '079095009876',
    position: 'Quản Lý Chi Nhánh Q1',
    date_joined: '01/04/2025',
    last_active: '2026-09-04 18:30',
    orders_count: 320,
    shifts_count: 42,
    hourly_rate: 25000,
    commission_per_order: 1500,
    permissions: {
      can_view_revenue: false,
      can_create_expense: true,
      can_cancel_order: false,
      can_edit_price: false
    },
    branch_id: 'b1111111-1111-1111-1111-111111111111',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 1'
  },
  {
    id: 'usr-4',
    username: 'chinhanh2',
    password: '123456',
    name: 'Phạm Thị Cơ Sở 2',
    role: 'BRANCH_STAFF',
    phone: '0283.822.2222',
    status: 'ACTIVE',
    email: 'quan3@gaumuoismart.vn',
    dob: '12/02/1997',
    id_card: '079097003456',
    position: 'Thu Ngân / Bếp Chi Nhánh Q3',
    date_joined: '10/05/2025',
    last_active: '2026-09-04 17:15',
    orders_count: 210,
    shifts_count: 38,
    hourly_rate: 25000,
    commission_per_order: 1500,
    permissions: {
      can_view_revenue: false,
      can_create_expense: true,
      can_cancel_order: false,
      can_edit_price: false
    },
    branch_id: 'b2222222-2222-2222-2222-222222222222',
    branch_name: 'Chi Nhánh Gà Ủ Muối Quận 3'
  }
];

function fontCancelOrderDefault(val: boolean) { return val; }

interface AuthContextType {
  user: UserAccount | null;
  accounts: (UserAccount & { password?: string })[];
  isLoading: boolean;
  isLoaded: boolean;
  login: (username: string, password: string) => { success: boolean; message?: string; redirectUrl?: string };
  logout: () => void;
  addUserAccount: (newAcc: Omit<UserAccount, 'id'> & { password: string }) => void;
  updateUserAccount: (id: string, updatedFields: Partial<UserAccount & { password?: string }>) => void;
  deleteUserAccount: (id: string) => void;
  isAllowedRoute: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserAccount | null>(null);
  const [accounts, setAccounts] = useState<(UserAccount & { password?: string })[]>(INITIAL_DEMO_ACCOUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = safeGetJSON<UserAccount | null>('pos_current_user', null) 
          || safeGetJSON<UserAccount | null>('gum_auth_user', null)
          || safeGetJSON<UserAccount | null>('auth_user', null);
        
        if (stored && typeof stored === 'object' && (stored as any).id) {
          setUser(stored);
        }

        const storedAccounts = safeGetJSON<(UserAccount & { password?: string })[]>('gum_accounts', INITIAL_DEMO_ACCOUNTS);
        if (storedAccounts && Array.isArray(storedAccounts) && storedAccounts.length > 0) {
          setAccounts(storedAccounts);
        }
      }
    } catch (e) {
      console.warn('Failed to parse user session on this device:', e);
      try {
        localStorage.removeItem('pos_current_user');
        localStorage.removeItem('gum_auth_user');
        localStorage.removeItem('auth_user');
      } catch (err) {}
    } finally {
      setIsLoading(false);
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
      const userStr = JSON.stringify(userNoPass);
      localStorage.setItem('pos_current_user', userStr);
      localStorage.setItem('gum_auth_user', userStr);
      localStorage.setItem('auth_user', userStr);
    } catch (e) {}

    let redirectUrl = '/admin/dashboard';
    if (found.role === 'OPERATOR') redirectUrl = '/admin/create-order';
    if (found.role === 'BRANCH_STAFF') redirectUrl = `/branch/${found.branch_id || 'b1111111-1111-1111-1111-111111111111'}`;
    if (found.role === 'SUPER_ADMIN') redirectUrl = '/admin/dashboard';

    return { success: true, redirectUrl };
  }, [accounts]);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('pos_current_user');
      localStorage.removeItem('gum_auth_user');
      localStorage.removeItem('auth_user');
    } catch (e) {}
    router.push('/login');
  }, [router]);

  const addUserAccount = useCallback((newAcc: Omit<UserAccount, 'id'> & { password: string }) => {
    const accWithId = {
      ...newAcc,
      id: `usr-${Date.now()}`,
      status: newAcc.status || ('ACTIVE' as const),
      created_at: new Date().toISOString(),
      last_active: 'Vừa tạo mới'
    };
    setAccounts((prev) => {
      const updated = [accWithId, ...prev];
      try {
        localStorage.setItem('gum_accounts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const updateUserAccount = useCallback((id: string, updatedFields: Partial<UserAccount & { password?: string }>) => {
    setAccounts((prev) => {
      const updated = prev.map((a) => {
        if (a.id !== id) return a;
        const cleanedFields = { ...updatedFields };
        if (cleanedFields.password === '') delete cleanedFields.password;
        return { ...a, ...cleanedFields };
      });
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

    const role = user.role || 'SUPER_ADMIN';
    if (role === 'SUPER_ADMIN') return true;

    if (role === 'OPERATOR') {
      return path === '/' || path.startsWith('/track') || path.startsWith('/admin/');
    }

    if (role === 'BRANCH_STAFF') {
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
    if (!isLoaded || isLoading) return;

    const isPublic = pathname === '/' || pathname.startsWith('/track') || pathname === '/login';

    if (!user && !isPublic) {
      router.push('/login');
    } else if (user && pathname === '/login') {
      if (user.role === 'OPERATOR') router.push('/admin/create-order');
      else if (user.role === 'BRANCH_STAFF') router.push(`/branch/${user.branch_id || 'b1111111-1111-1111-1111-111111111111'}`);
      else router.push('/admin/orders');
    } else if (user && !isAllowedRoute(pathname)) {
      if (user.role === 'OPERATOR') router.push('/admin/create-order');
      else if (user.role === 'BRANCH_STAFF') router.push(`/branch/${user.branch_id || 'b1111111-1111-1111-1111-111111111111'}`);
      else router.push('/admin/orders');
    }
  }, [pathname, user, isLoaded, isLoading, isAllowedRoute, router]);

  const value = useMemo(() => ({
    user,
    accounts,
    isLoading,
    isLoaded,
    login,
    logout,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
    isAllowedRoute,
  }), [user, accounts, isLoading, isLoaded, login, logout, addUserAccount, updateUserAccount, deleteUserAccount, isAllowedRoute]);

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
