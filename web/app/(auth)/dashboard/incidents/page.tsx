"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, Trash2, AlertCircle, X, Plus } from "lucide-react";
import CreateIncidentForm from "@/components/dashboard/register-incident-form";
import { Button } from "@/components/ui/button";
import { useIncidents } from "@/contexts/incidents";
import { websocketService } from "@/lib/websocket";

type Evidence = {
  status: string;
  text: string;
  timestamp: string;
};

type Incident = {
  id: string;
  title: string;
  description?: string;
  incident_type?: string;
  severity?: string;
  location?: { city: string; address: string };
  status: string;
  assigned_rescuer?: { name: string };
  created_at: string;
  evidences?: Evidence[];
};

type ApiIncident = {
  id: string;
  type: string;
  severity: string;
  description: string;
  city: string;
  address: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

type Rescuer = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  is_online: boolean;
  is_available: boolean;
};

type Resource = {
  id: string;
  type: string;
  status: string;
  capacity: number;
};

const API_URL = "https://f93e1a5aa39c.ngrok-free.app";

const statusColors = {
  NO_ASIGNADO: "bg-gray-100 text-gray-800",
  REPORTADO: "bg-red-100 text-red-800",
  ASIGNADO: "bg-blue-100 text-blue-800",
  EN_ATENCION: "bg-yellow-100 text-yellow-800",
  RESUELTO: "bg-green-100 text-green-800",
  NOTA: "bg-purple-100 text-purple-800",
} as const;

const statusLabel = {
  NO_ASIGNADO: "No Asignado",
  REPORTADO: "Reportado",
  ASIGNADO: "Asignado",
  EN_ATENCION: "En Atención",
  RESUELTO: "Resuelto",
  NOTA: "Nota del Rescatista",
} as const;

const mapStatus = (status: string): Incident["status"] => {
  const normalized = status.toUpperCase();
  if (normalized === "POR_ASIGNAR") return "NO_ASIGNADO";
  if (normalized === "EN_PROGRESO") return "EN_ATENCION";
  return normalized as Incident["status"];
};

const mapApiIncident = (apiIncident: ApiIncident): Incident => {
  return {
    id: apiIncident.id,
    title: apiIncident.description || apiIncident.type,
    description: apiIncident.description,
    incident_type: apiIncident.type,
    severity: apiIncident.severity?.toUpperCase(),
    location: { city: apiIncident.city, address: apiIncident.address },
    status: mapStatus(apiIncident.status),
    assigned_rescuer: apiIncident.assigned_to ? { name: apiIncident.assigned_to } : undefined,
    created_at: apiIncident.created_at,
    evidences: [],
  };
};

export default function IncidentsPage() {
  const { updateIncidentStatus, updateIncidentRescuer, setIncidents: setContextIncidents } = useIncidents();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [incidentToAssign, setIncidentToAssign] = useState<string | null>(null);
  const [incidentResources, setIncidentResources] = useState<string[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [errorIncidents, setErrorIncidents] = useState<string | null>(null);
  const [rescuers, setRescuers] = useState<Rescuer[]>([]);
  const [loadingRescuers, setLoadingRescuers] = useState(false);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [incidentAssignedResources, setIncidentAssignedResources] = useState<Resource[]>([]);
  const [loadingIncidentResources, setLoadingIncidentResources] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    setErrorIncidents(null);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/incidents/get-incidents`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (!res.ok) {
        const errorText = await res.text();
        const detail = isJson ? (JSON.parse(errorText)?.detail as string | undefined) : undefined;
        throw new Error(detail || errorText || "No se pudieron cargar los incidentes");
      }

      if (!isJson) {
        throw new Error("La respuesta del servidor no es JSON");
      }

      let data: ApiIncident[] = [];
      try {
        data = await res.json();
      } catch {
        throw new Error("No se pudo parsear la respuesta JSON");
      }

      setIncidents(Array.isArray(data) ? data.map(mapApiIncident) : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los incidentes";
      setErrorIncidents(message);
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  const fetchIncidentNotes = useCallback(async (incidentId: string) => {
    setLoadingNotes(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/notes/get-notes/${incidentId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar las notas");
      }

      const data: { note: string; created_at: string }[] = await res.json();
      const evidenceNotes: Evidence[] = (Array.isArray(data) ? data : []).map(item => ({
        status: "NOTA",
        text: item.note,
        timestamp: item.created_at,
      }));

      setSelectedIncident(prev => {
        if (!prev || prev.id !== incidentId) return prev;
        return {
          ...prev,
          evidences: evidenceNotes,
        };
      });
    } catch (error) {
      console.error("Error al cargar notas:", error);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  // Escuchar eventos del WebSocket
  useEffect(() => {
    const unsubscribeStatusUpdate = websocketService.onEvent('incident_status_updated', (data) => {
      console.log('[Dashboard] Status actualizado:', data);
      if (data.incident_id && data.data?.new_status) {
        const mapped = mapStatus(String(data.data.new_status));
        updateIncidentStatus(data.incident_id, mapped);
        setIncidents(prev =>
          prev.map(incident =>
            incident.id === data.incident_id
              ? { ...incident, status: mapped }
              : incident
          )
        );
        if (selectedIncident?.id === data.incident_id) {
          setSelectedIncident(prev => (prev ? { ...prev, status: mapped } : null));
        }
      }
    });

    const unsubscribeRescuerAssigned = websocketService.onEvent('rescuer_assigned', (data) => {
      console.log('[Dashboard] Rescatista asignado:', data);
      if (data.incident_id && data.data?.rescuer_id) {
        updateIncidentRescuer(data.incident_id, data.data.rescuer_id);
        const incomingStatus = data.data?.status as string | undefined;
        const mappedStatus = incomingStatus ? mapStatus(String(incomingStatus)) : undefined;
        setIncidents(prev =>
          prev.map(incident =>
            incident.id === data.incident_id
              ? {
                  ...incident,
                  assigned_rescuer: { name: data.data.rescuer_id },
                  ...(mappedStatus ? { status: mappedStatus } : {}),
                }
              : incident
          )
        );
        if (selectedIncident?.id === data.incident_id) {
          setSelectedIncident(prev =>
            prev
              ? {
                  ...prev,
                  assigned_rescuer: { name: data.data.rescuer_id },
                  ...(mappedStatus ? { status: mappedStatus } : {}),
                }
              : null
          );
        }
      }
    });

    const unsubscribeResourcesAssigned = websocketService.onEvent('resources_assigned', (data) => {
      console.log('[Dashboard] Recursos asignados:', data);
      if (data.incident_id) {
        // Aquí puedes actualizar los recursos si es necesario
      }
    });

    const unsubscribeFieldNoteAdded = websocketService.onEvent('field_note_added', (data) => {
      console.log('[Dashboard] Nota agregada:', data);
      console.log('[Dashboard] data.data:', data.data);
      console.log('[Dashboard] data.data.resource_id:', data.data?.resource_id);
      if (data.incident_id) {
        fetchIncidentNotes(data.incident_id);
      }
    });

    return () => {
      unsubscribeStatusUpdate();
      unsubscribeRescuerAssigned();
      unsubscribeResourcesAssigned();
      unsubscribeFieldNoteAdded();
    };
  }, [selectedIncident, updateIncidentStatus, updateIncidentRescuer]);

  const fetchRescuers = useCallback(async () => {
    setLoadingRescuers(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/auth/get-rescuers`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar los rescatistas");
      }

      const data: Rescuer[] = await res.json();
      setRescuers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar rescatistas:", error);
      setRescuers([]);
    } finally {
      setLoadingRescuers(false);
    }
  }, []);

  const handleAssignClick = (incidentId: string) => {
    setIncidentToAssign(incidentId);
    setShowAssignModal(true);
    fetchRescuers();
  };

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
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
      setAvailableResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar recursos:", error);
      setAvailableResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, []);

  const fetchIncidentResources = useCallback(async (incidentId: string) => {
    setLoadingIncidentResources(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/resource/get-resources-by-incident/${incidentId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron cargar los recursos del incidente");
      }

      const data = await res.json();
      console.log('[fetchIncidentResources] Data received:', data);
      // Manejar si viene un array de recursos completos o de objetos con resource_id
      const resources = Array.isArray(data) ? data : [];
      setIncidentAssignedResources(resources);
    } catch (error) {
      console.error("Error al cargar recursos del incidente:", error);
      setIncidentAssignedResources([]);
    } finally {
      setLoadingIncidentResources(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const incidentId = selectedIncident?.id;
    if (incidentId) {
      fetchResources();
      fetchIncidentResources(incidentId);
      fetchIncidentNotes(incidentId);
    }
  }, [selectedIncident?.id, fetchResources, fetchIncidentResources, fetchIncidentNotes]);

  const handleAssignRescuer = async (rescuerId: string, rescuerName: string) => {
    if (!incidentToAssign) return;

    try {
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/incidents/assign/${incidentToAssign}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          rescuer_id: rescuerId,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo asignar el rescatista");
      }

      // Actualizar el incidente con el rescatista asignado
      setIncidents(prev => prev.map(inc => 
        inc.id === incidentToAssign 
          ? { ...inc, status: "ASIGNADO", assigned_rescuer: { name: rescuerName } }
          : inc
      ));
      
      setShowAssignModal(false);
      setIncidentToAssign(null);
      alert(`Rescatista ${rescuerName} asignado correctamente`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al asignar rescatista";
      alert(message);
    }
  };

  const handleAddIncidentResource = () => {
    setIncidentResources([...incidentResources, ""]);
  };

  const handleRemoveIncidentResource = (index: number) => {
    setIncidentResources(incidentResources.filter((_, i) => i !== index));
  };

  const handleIncidentResourceChange = (index: number, value: string) => {
    const updatedResources = [...incidentResources];
    updatedResources[index] = value;
    setIncidentResources(updatedResources);
  };

  const handleSaveResources = async () => {
    if (!selectedIncident || incidentResources.length === 0) {
      alert("Por favor selecciona un recurso");
      return;
    }

    try {
      const resourceId = incidentResources[0];
      const token = localStorage.getItem("token") || localStorage.getItem("access_token");
      
      const res = await fetch(`${API_URL}/incidents/incident-resources/${selectedIncident.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          resource_id: resourceId,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar el recurso");
      }

      alert("Recurso asignado correctamente");
      setSelectedIncident(null);
      setIncidentResources([]);
      await fetchIncidents();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar recurso";
      alert(message);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-red-50 via-white to-orange-50">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Incidentes</h1>
          <p className="text-gray-600">
            Total de incidentes: <span className="font-semibold">{incidents.length}</span>
          </p>
          {errorIncidents && (
            <p className="text-sm text-red-600 mt-2">{errorIncidents}</p>
          )}
        </div>

        {/* Botón Crear Incidente */}
        <Button
          onClick={() => setShowCreateForm(true)}
          className="mb-6 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Crear incidente
        </Button>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loadingIncidents ? (
              <div className="p-8 text-center text-gray-600">Cargando incidentes...</div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay incidentes registrados</h3>
                <p className="text-gray-600">Crea tu primer incidente usando el botón de arriba</p>
              </div>
            ) : (
              <table className="w-full">
                {/* Header */}
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Título
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Rescatista
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className={`transition ${
                        incident.status === "NO_ASIGNADO"
                          ? "bg-red-50 hover:bg-red-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{incident.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            statusColors[incident.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {statusLabel[incident.status as keyof typeof statusLabel] || incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600">
                          {incident.assigned_rescuer?.name || (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {new Date(incident.created_at).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {incident.status === "NO_ASIGNADO" && (
                            <button
                              onClick={() => handleAssignClick(incident.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              Asignar
                            </button>
                          )}
                          {incident.status !== "NO_ASIGNADO" && (
                            <button
                              onClick={() => setSelectedIncident(incident)}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      {/* Modal de Detalles del Incidente */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-linear-to-br from-red-600/30 to-orange-600/30 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-linear-to-r from-red-600 to-orange-600 text-white p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedIncident.title}</h2>
                <p className="text-red-100 mt-1">ID: {selectedIncident.id}</p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-2 hover:bg-red-700 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Estado</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[selectedIncident.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {statusLabel[selectedIncident.status as keyof typeof statusLabel] || selectedIncident.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Rescatista Asignado</p>
                  <p className="font-medium">
                    {selectedIncident.assigned_rescuer?.name || "No asignado"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Tipo de Incidente</p>
                  <p className="font-medium">
                    {selectedIncident.incident_type || "No especificado"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Severidad</p>
                  <p className="font-medium">
                    {selectedIncident.severity || "No especificada"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Ubicación</p>
                  <p className="font-medium">
                    {selectedIncident.location?.address || "No especificada"}, {selectedIncident.location?.city || ""}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg col-span-3">
                  <p className="text-sm text-gray-600 mb-1">Fecha de Creación</p>
                  <p className="font-medium">
                    {new Date(selectedIncident.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Descripción</h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedIncident.description || "No hay descripción disponible"}
                </p>
              </div>

              {/* Evidencias y Notas del Rescatista */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Evidencias y Notas</h3>

                {/* Lista de Evidencias */}
                <div className="space-y-3 mb-4">
                  {loadingNotes ? (
                    <div className="text-sm text-gray-600 py-2">Cargando notas...</div>
                  ) : selectedIncident.evidences && selectedIncident.evidences.length > 0 ? (
                    selectedIncident.evidences.map((evidence, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm ${
                        evidence.status === "NOTA" 
                          ? "border-purple-500 bg-linear-to-r from-purple-50 to-white" 
                          : "border-blue-500 bg-gray-50"
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                              statusColors[evidence.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {evidence.status === "NOTA" && (
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            )}
                            {statusLabel[evidence.status as keyof typeof statusLabel] || evidence.status}
                          </span>
                          <p className="text-xs text-gray-500 font-medium">
                            {new Date(evidence.timestamp).toLocaleString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                        <p className={`leading-relaxed ${
                          evidence.status === "NOTA" 
                            ? "text-gray-900 font-medium text-sm" 
                            : "text-gray-700 text-sm"
                        }`}>{evidence.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 text-sm font-medium">Sin evidencias ni notas registradas</p>
                      <p className="text-gray-400 text-xs mt-1">Las notas del rescatista aparecerán aquí</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recursos del Incidente */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recursos Asignados</h3>
                </div>
                
                {/* Recursos actualmente asignados */}
                {loadingIncidentResources ? (
                  <div className="text-sm text-gray-600 py-2 mb-4">Cargando recursos del incidente...</div>
                ) : incidentAssignedResources.length > 0 ? (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Recursos actualmente asignados:</h4>
                    <div className="space-y-2">
                      {incidentAssignedResources.map((resource, index) => (
                        <div key={resource.id || index} className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                          <div>
                            <p className="font-medium text-gray-900">{resource.type || "Sin nombre"}</p>
                            <p className="text-sm text-gray-600">Capacidad: {resource.capacity || "N/A"}</p>
                            <p className="text-xs text-gray-500">Estado: {resource.status === 'available' ? 'Disponible' : 'No disponible'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                    <p className="text-sm text-gray-600">No hay recursos asignados a este incidente</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona un recurso para asignar</label>
                    {loadingResources ? (
                      <div className="text-sm text-gray-600 py-2">Cargando recursos...</div>
                    ) : availableResources.length === 0 ? (
                      <div className="text-sm text-gray-600 py-2">No hay recursos disponibles</div>
                    ) : (
                      <select
                        value={incidentResources[0] || ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            setIncidentResources([e.target.value]);
                          } else {
                            setIncidentResources([]);
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                      >
                        <option value="">-- Selecciona un recurso --</option>
                        {availableResources.filter(r => r.status === "available").map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.type} (Capacidad: {resource.capacity})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {incidentResources.length > 0 && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">Recurso seleccionado:</h4>
                        <div className="space-y-2">
                          {incidentResources.map((resourceId, index) => {
                            const resource = availableResources.find(r => r.id === resourceId);
                            return (
                              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                                <div>
                                  <p className="font-medium text-gray-900">{resource?.type || "Recurso desconocido"}</p>
                                  <p className="text-sm text-gray-600">Capacidad: {resource?.capacity || "N/A"}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setIncidentResources([])}
                                  className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                  title="Eliminar recurso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveResources}
                        className="w-full mt-3 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                      >
                        Guardar Recursos
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Incidente */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-linear-to-br from-red-600/30 to-orange-600/30 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-linear-to-r from-red-600 to-orange-600 text-white p-6 flex justify-between items-start sticky top-0">
              <h2 className="text-2xl font-bold">Crear Incidente</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-red-700 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del Formulario */}
            <div className="p-6">
              <CreateIncidentForm
                onSuccess={() => {
                  setShowCreateForm(false);
                  fetchIncidents();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Rescatista */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-linear-to-br from-red-600/30 to-orange-600/30 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            {/* Header del Modal */}
            <div className="bg-linear-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-start">
              <h2 className="text-2xl font-bold">Asignar Rescatista</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setIncidentToAssign(null);
                }}
                className="p-2 hover:bg-green-800 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Selecciona un rescatista disponible:
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loadingRescuers ? (
                  <div className="text-center py-8 text-gray-600">Cargando rescatistas...</div>
                ) : rescuers.filter(r => r.is_available).length === 0 ? (
                  <div className="text-center py-8 text-gray-600">No hay rescatistas disponibles</div>
                ) : (
                  rescuers.filter(r => r.is_available).map((rescuer) => (
                    <div
                      key={rescuer.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                          {rescuer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{rescuer.name} {rescuer.lastname}</p>
                          <p className="text-sm text-gray-500">{rescuer.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignRescuer(rescuer.id, `${rescuer.name} ${rescuer.lastname}`)}
                        className="px-4 py-2 rounded-lg transition-all duration-200 font-medium bg-linear-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                      >
                        Asignar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
