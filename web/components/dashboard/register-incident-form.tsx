"use client"

import { useState, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";

interface CreateIncidentFormProps {
  onSuccess?: () => void;
}

export default function CreateIncidentForm({ onSuccess }: CreateIncidentFormProps) {
  const [form, setForm] = useState({
    type: "",
    severity: "",
    description: "",
    city: "",
    address: "",
    status: "por_asignar",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      await fetch("https://f93e1a5aa39c.ngrok-free.app/incidents/create-incident", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          type: form.type,
          severity: form.severity,
          description: form.description,
          city: form.city,
          address: form.address,
          status: form.status,
        }),
      });

      alert("Incidente creado correctamente");
      setForm({
        type: "",
        severity: "",
        description: "",
        city: "",
        address: "",
        status: "por_asignar",
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      alert("Error creando incidente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <input
                name="type"
                type="text"
                placeholder="Ej: natural, químico, eléctrico"
                value={form.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                required
              />
            </div>

            {/* Severidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severidad</label>
              <input
                name="severity"
                type="text"
                placeholder="Ej: grave, alta, media"
                value={form.severity}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                required
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                name="description"
                placeholder="Proporciona detalles del incidente..."
                value={form.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition resize-none"
                required
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
              <div className="space-y-3">
                <input
                  name="city"
                  type="text"
                  placeholder="Ciudad"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  required
                />
                <input
                  name="address"
                  type="text"
                  placeholder="Dirección"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                required
              >
                <option value="por_asignar">Por asignar</option>
                <option value="en_progreso">En progreso</option>
                <option value="reportado">Reportado</option>
                <option value="asignado">Asignado</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </div>

            {/* Botón Submit */}
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg transition duration-200 mt-8"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creando incidente...
                </span>
              ) : (
                "Crear Incidente"
              )}
            </Button>
          </form>
    </div>
  );
}