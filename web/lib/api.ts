import { LoginRequest, AuthResponse, RegisterRequest, User, AuthResponseProcessed } from "./types";
import { getUserFromToken, getToken } from "./auth";
import { websocketService } from "./websocket";

const API_URL = 'https://f93e1a5aa39c.ngrok-free.app';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponseProcessed> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error en login');
    }

    const data: AuthResponse = await response.json();
    const user = getUserFromToken(data.access_token);

    if (!user) {
      throw new Error('No se pudo extraer información del usuario');
    }

    // Conectar WebSocket al iniciar sesión (solo si estamos en cliente)
    if (typeof window !== 'undefined') {
      try {
        websocketService.disconnect();
        console.log('[AuthAPI] Conectando WebSocket...');
        await websocketService.connect(data.access_token);
        console.log('[AuthAPI] WebSocket conectado');
      } catch (error) {
        console.error('[AuthAPI] Error al conectar WebSocket:', error);
      }
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user,
    };
  },

  register: async (data: RegisterRequest): Promise<AuthResponseProcessed> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error en registro');
    }

    const authData: AuthResponse = await response.json();
    const user = getUserFromToken(authData.access_token);

    if (!user) {
      throw new Error('No se pudo extraer información del usuario');
    }

    return {
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      user,
    };
  },

  getMe: async (token: string): Promise<User> => {
    const user = getUserFromToken(token);
    if (!user) {
      throw new Error('Token inválido');
    }
    return user;
  },
};