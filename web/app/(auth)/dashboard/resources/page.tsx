"use client"

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface Resource {
  id: string;
  type: string;
  status: string;
  capacity: number;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    status: "",
    capacity: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      setResources(data);
    } catch (err) {
      console.error("Error cargando recursos", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.type === "number" ? parseInt(e.target.value) : e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/resources/${editingId}` : "/api/resources";

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      setFormData({ type: "", status: "", capacity: 0 });
      setEditingId(null);
      setShowForm(false);
      fetchResources();
    } catch (err) {
      alert("Error al guardar recurso");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setFormData({
      type: resource.type,
      status: resource.status,
      capacity: resource.capacity,
    });
    setEditingId(resource.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este recurso?")) return;

    try {
      await fetch(`/api/resources/${id}`, { method: "DELETE" });
      fetchResources();
    } catch (err) {
      alert("Error al eliminar recurso");
      console.error(err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ type: "", status: "", capacity: 0 });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gestión de Recursos</h1>
          <p className="text-gray-600">Registra y administra los recursos disponibles para asignación a incidentes</p>
        </div>

        {/* Botón para abrir formulario */}
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="mb-6 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Agregar Recurso
          </Button>
        )}

        {/* Formulario */}
        {showForm && (
          <Card className="mb-8 shadow-lg border-0">
            <CardContent className="pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingId ? "Editar Recurso" : "Nuevo Recurso"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Recurso</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                      required
                    >
                      <option value="">Selecciona un tipo</option>
                      <option value="AMBULANCIA">Ambulancia</option>
                      <option value="BOMBEROS">Bomberos</option>
                      <option value="POLICIA">Policía</option>
                      <option value="EQUIPOS_RESCATE">Equipos de Rescate</option>
                      <option value="HELICOPTERO">Helicóptero</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition bg-white"
                      required
                    >
                      <option value="">Selecciona un estado</option>
                      <option value="DISPONIBLE">Disponible</option>
                      <option value="EN_USO">En Uso</option>
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacidad</label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      placeholder="Ej: 5 personas, 10 unidades, etc."
                      min="0"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-2.5 rounded-lg transition"
                  >
                    {loading ? "Guardando..." : "Guardar Recurso"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2.5 rounded-lg transition"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabla de Recursos */}
        <Card className="shadow-lg border-0">
          <CardContent className="pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recursos Registrados</h2>
            {resources.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No hay recursos registrados aún</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Tipo</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-900">Estado</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-900">Capacidad</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((resource) => (
                      <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                            {resource.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            resource.status === 'DISPONIBLE' ? 'bg-green-100 text-green-800' :
                            resource.status === 'EN_USO' ? 'bg-yellow-100 text-yellow-800' :
                            resource.status === 'MANTENIMIENTO' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {resource.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-900 font-medium">{resource.capacity}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(resource)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(resource.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
