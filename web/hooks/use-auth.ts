"use client";

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';
import { getToken, saveToken, clearTokens } from '@/lib/auth';
import { websocketService } from '@/lib/websocket';
import type { User, AuthResponseProcessed } from '@/lib/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.getMe(token)
        .then(async (userData) => {
          setUser(userData);
          // Conectar WS si ya hay token guardado (ej. recarga de página)
          try {
            console.log('[Auth] Conectando WebSocket (token existente)...');
            await websocketService.connect(token);
          } catch (err) {
            console.error('[Auth] Error al conectar WebSocket con token existente:', err);
          }
        })
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response: AuthResponseProcessed = await authApi.login({ email, password });
    saveToken(response.access_token, response.refresh_token);
    setUser(response.user);
  };

  const register = async (email: string, password: string, full_name: string, role: 'rescatista' | 'operador'): Promise<void> => {
    const response: AuthResponseProcessed = await authApi.register({ email, password, full_name, role });
    saveToken(response.access_token, response.refresh_token);
    setUser(response.user);
  };

  const logout = () => {
    websocketService.disconnect(); // Desconectar WebSocket al logout
    clearTokens();
    setUser(null);
  };

  return { user, loading, login, register, logout };
};