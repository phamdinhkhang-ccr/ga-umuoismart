export type UserRole = 'SUPER_ADMIN' | 'OPERATOR' | 'BRANCH_STAFF' | 'PUBLIC';

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
  branch_id?: string;
  branch_name?: string;
  created_at?: string;
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
}
