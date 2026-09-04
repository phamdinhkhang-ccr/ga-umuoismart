export type UserRole = 'SUPER_ADMIN' | 'OPERATOR' | 'BRANCH_STAFF' | 'PUBLIC';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  branch_id?: string;
  branch_name?: string;
  created_at?: string;
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
}
