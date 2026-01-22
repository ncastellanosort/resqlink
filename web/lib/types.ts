export type UserRole = 'operator' | 'rescue';

export interface User {
  id: string;
  email: string;
  name?: string;
  lastname?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  lastname: string;
  role: UserRole;
}

export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  user_metadata?: {
    name?: string;
    lastname?: string;
    role?: UserRole;
  };
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

// Respuesta del API después de procesar
export interface AuthResponseProcessed {
  access_token: string;
  refresh_token: string;
  user: User;
}