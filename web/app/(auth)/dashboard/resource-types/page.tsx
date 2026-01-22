"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Edit2, AlertCircle } from "lucide-react";

type Resource = {
  id: string;
  type: string;
  status: string;
  capacity: number;
};

const API_URL = "https://f93e1a5aa39c.ngrok-free.app";

export default function ResourceTypesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [errorResources, setErrorResources] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [form, setForm] = useState({
    type: "",
    status: "available",
    capacity: "",
  });

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    setErrorResources(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/resource/get-resources`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar los recursos");
      }

      const data: Resource[] = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al cargar recursos";
      setErrorResources(message);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.type.trim() || !form.capacity) {
      alert("Por favor completa todos los campos");
      return;
    }

    setLoadingForm(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/resource/create-resource`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          type: form.type,
          status: form.status,
          capacity: parseInt(form.capacity),
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo crear el recurso");
      }

      alert("Recurso creado correctamente");
      setForm({ type: "", status: "available", capacity: "" });
      setShowForm(false);
      await fetchResources();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al crear recurso";
      alert(message);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleCancel = () => {
    setForm({ type: "", status: "available", capacity: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipos de Recursos</h1>
          <p className="text-gray-600 mt-1">Gestiona los tipos de recursos disponibles</p>
          {errorResources && (
            <p className="text-sm text-red-600 mt-2">{errorResources}</p>
          )}
        </div>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Tipo
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Nuevo Tipo de Recurso</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Recurso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="Ej: Ambulancia, Unidad Médica, etc."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="available">Disponible</option>
                <option value="unavailable">No Disponible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="Ej: 6"
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loadingForm}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingForm ? "Creando..." : "Crear"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Tipos de Recursos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loadingResources ? (
            <div className="p-8 text-center text-gray-600">Cargando recursos...</div>
          ) : resources.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recursos registrados</h3>
              <p className="text-gray-600">Crea tu primer recurso usando el botón de arriba</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Capacidad
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resources.map((resource) => (
                  <tr key={resource.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {resource.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        resource.status === "available"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {resource.status === "available" ? "Disponible" : "No Disponible"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 font-medium">Capacidad: {resource.capacity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg opacity-50 cursor-not-allowed text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          disabled
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg opacity-50 cursor-not-allowed text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
