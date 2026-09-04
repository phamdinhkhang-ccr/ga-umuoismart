export type UserRole = 'SUPER_ADMIN' | 'OPERATOR' | 'BRANCH_STAFF' | 'PUBLIC';

export interface UserPermissions {
  can_view_revenue: boolean;
  can_create_expense: boolean;
  can_cancel_order: boolean;
  can_edit_price: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  status?: 'ACTIVE' | 'LOCKED';
  email?: string;
  dob?: string;
  id_card?: string;
  position?: string;
  date_joined?: string;
  last_active?: string;
  orders_count?: number;
  shifts_count?: number;
  hourly_rate?: number;
  monthly_salary?: number;
  commission_per_order?: number;
  permissions?: UserPermissions;
  branch_id?: string;
  branch_name?: string;
  created_at?: string;
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
}
