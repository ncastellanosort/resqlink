import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Ambulance, Shield } from 'lucide-react';
import { authApi } from '@/lib/api';
import { saveToken } from '@/lib/auth';
import { UserRole } from '@/lib/types';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  lastname: string;
  role: UserRole;
}

export const RegisterPage = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    lastname: '',
    role: 'rescue'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: form.email,
        password: form.password,
        name: form.name,
        lastname: form.lastname,
        role: form.role
      });
      
      saveToken(response.access_token, response.refresh_token);
      router.push('/dashboard/incidents');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-red-600 via-red-700 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-red-600 to-orange-600 rounded-full mb-4">
            <Ambulance className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">ResQLink</h1>
          <p className="text-red-600 font-semibold mt-2">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Nicolas"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellido
            </label>
            <input
              type="text"
              required
              value={form.lastname}
              onChange={(e) => setForm({ ...form, lastname: e.target.value })}
              className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Castellanos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de usuario
            </label>
            <div className="grid grid-cols-2 text-gray-600 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'rescue' })}
                className={`p-4 border-2 rounded-lg transition ${
                  form.role === 'rescue'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Ambulance className={`w-8 h-8 mx-auto mb-2 ${
                  form.role === 'rescue' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <div className="text-sm font-semibold">Rescatista</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'operator' })}
                className={`p-4 border-2 rounded-lg transition ${
                  form.role === 'operator'
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Shield className={`w-8 h-8 mx-auto mb-2 ${
                  form.role === 'operator' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <div className="text-sm font-semibold">Operador</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar contraseña
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border text-gray-600 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Repite tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-red-600 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
};