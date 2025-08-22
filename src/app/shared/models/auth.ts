export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  role?: 'ADMIN' | 'AUTHOR' | 'JOURNALIST' | 'EDITOR' | 'COLUMNIST' | 'CONTRIBUTOR' | 'REPORTER' | 'USER';
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}