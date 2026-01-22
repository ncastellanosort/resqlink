import { API_URL } from '../constants/config';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';
import { websocketService } from './websocket';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.detail || 'Error en login');
    }

    const data = await response.json();
    
    // Conectar WebSocket al iniciar sesión
    try {
      websocketService.disconnect();
      console.log('[AuthAPI] Conectando WebSocket...');
      await websocketService.connect(data.access_token);
      console.log('[AuthAPI] WebSocket conectado');
    } catch (error) {
      console.error('[AuthAPI] Error al conectar WebSocket:', error);
    }

    return data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.detail || 'Error en registro');
    }

    return response.json();
  },

  getMe: async (token: string): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token inválido');
    }

    return response.json();
  },
};