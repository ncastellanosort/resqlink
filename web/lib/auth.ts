import type { JWTPayload, User } from './types';

/**
 * Decodifica un JWT sin verificar la firma (válido para cliente)
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );
    return decoded;
  } catch (error) {
    console.error('Error decodificando JWT:', error);
    return null;
  }
};

/**
 * Extrae información del usuario desde el JWT
 */
export const getUserFromToken = (token: string): User | null => {
  const payload = decodeJWT(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    full_name: payload.user_metadata?.full_name,
    role: payload.user_metadata?.role,
  };
};

/**
 * Verifica si un token ha expirado
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Guarda el token en localStorage
 */
export const saveToken = (token: string, refreshToken?: string): void => {
  localStorage.setItem('access_token', token);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
};

/**
 * Obtiene el token de localStorage
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

/**
 * Limpia los tokens de localStorage
 */
export const clearTokens = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
