import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/app-navigator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { websocketService } from "../services/websocket";

type Props = NativeStackScreenProps<RootStackParamList, "IncidentDetail">;

const API_URL = "https://f93e1a5aa39c.ngrok-free.app";

interface Incident {
  id: string;
  title: string;
  incident_type: string;
  description: string;
  status: string;
  severity?: string;
  city?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  assigned_rescuer?: { name: string };
}

interface ApiIncident {
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
}

interface Resource {
  id: string;
  type: string;
  status: string;
  capacity: number;
}

const mapStatus = (status: string): string => {
  const normalized = status.toUpperCase();
  if (normalized === "POR_ASIGNAR") return "NO_ASIGNADO";
  if (normalized === "EN_PROGRESO") return "EN_ATENCION";
  return normalized;
};

const mapApiIncident = (apiIncident: ApiIncident): Incident => {
  return {
    id: apiIncident.id,
    title: apiIncident.description || apiIncident.type,
    incident_type: apiIncident.type.toUpperCase(),
    description: apiIncident.description,
    status: mapStatus(apiIncident.status),
    severity: apiIncident.severity,
    city: apiIncident.city,
    address: apiIncident.address,
    assigned_rescuer: apiIncident.assigned_to ? { name: "Asignado" } : undefined,
  };
};

const statusColors = {
  NO_ASIGNADO: { color: "#6b7280", label: "No Asignado", icon: "alert-circle" as const },
  EN_CAMINO: { color: "#6366f1", label: "En Camino", icon: "car" as const },
  ASIGNADO: { color: "#3b82f6", label: "Asignado", icon: "checkmark-circle" as const },
  EN_ATENCION: { color: "#f59e0b", label: "En Atención", icon: "navigate" as const },
  RESUELTO: { color: "#10b981", label: "Resuelto", icon: "checkmark-done" as const },
};

const statusFlow = ["EN_CAMINO", "EN_ATENCION", "RESUELTO"] as const;

const incidentTypeLabels = {
  MEDICAL: "Médico",
  FIRE: "Incendio",
  RESCUE: "Rescate",
};

export default function IncidentDetailScreen({ route, navigation }: Props) {
  const { incident: incidentParam } = route.params;
  const [incident, setIncident] = useState<Incident | null>(incidentParam);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const fetchResources = useCallback(async () => {
    if (!incident?.id) return;
    
    setLoadingResources(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/resource/get-resources-by-incident/${incident.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!res.ok) {
        throw new Error('No se pudieron cargar los recursos');
      }

      const json: any = await res.json();
      const arr: Resource[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.resources)
            ? json.resources
            : [];
      setResources(arr);
    } catch (error) {
      console.error('Error al cargar recursos:', error);
      setResources([]);
    } finally {
      setLoadingResources(false);
    }
  }, [incident?.id]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Listen for WS status updates for this incident
  useEffect(() => {
    const unsubscribe = websocketService.onEvent("incident_status_updated", (payload: any) => {
      try {
        if (!incident?.id) return;
        const { incident_id, data } = payload || {};
        if (incident_id === incident.id && data?.status) {
          const raw = String(data.status);
          const nextStatus = mapStatus(raw);
          setIncident(prev => (prev ? { ...prev, status: nextStatus } : prev));
        }
      } catch (err) {
        console.error("[WS] Error aplicando update de estado:", err);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [incident?.id]);

  // Listen for WS resources_assigned events to reload resources
  useEffect(() => {
    const unsubscribe = websocketService.onEvent("resources_assigned", (payload: any) => {
      try {
        if (!incident?.id) return;
        const { incident_id } = payload || {};
        if (incident_id === incident.id) {
          console.log("[WS] Recursos asignados, recargando...");
          fetchResources();
        }
      } catch (err) {
        console.error("[WS] Error recargando recursos:", err);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [incident?.id, fetchResources]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!incident?.id) return;
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/incidents/update-incident/${incident.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "No se pudo actualizar el estado");
      }

      // Optimistic update; WS will confirm and keep in sync
      setIncident(prev => (prev ? { ...prev, status: newStatus } : prev));
      setNotes("");

      if (newStatus === "RESUELTO") {
        Alert.alert("¡Has resuelto el incidente!", undefined, [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);
      Alert.alert("Error", "No se pudo actualizar el estado");
    } finally {
      setUpdating(false);
    }
  };

  const handleSendNote = async () => {
    if (!incident?.id || !notes.trim()) {
      Alert.alert("Error", "Por favor escribe una nota antes de enviar");
      return;
    }

    setSendingNote(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/notes/create-note/${incident.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ note: notes }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "No se pudo enviar la nota");
      }

      Alert.alert("Éxito", "Nota enviada correctamente");
      setNotes("");
    } catch (error) {
      console.error("Error enviando nota:", error);
      Alert.alert("Error", "No se pudo enviar la nota");
    } finally {
      setSendingNote(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (!incident) return <Text style={styles.errorText}>No incident found</Text>;

  const statusInfo = statusColors[incident.status as keyof typeof statusColors];
  const typeLabel = incidentTypeLabels[incident.incident_type as keyof typeof incidentTypeLabels];

  return (
    <LinearGradient colors={["#f0f4fa", "#ffffff"]} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#2d5a8c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Incidente</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
          <Ionicons name={statusInfo.icon as any} size={20} color={statusInfo.color} />
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{incident.title}</Text>
          
          <View style={styles.typeContainer}>
            {incident.severity && (
              <View style={[styles.typeBadge, { backgroundColor: "#fef3c7" }]}>
                <Text style={[styles.typeText, { color: "#d97706" }]}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {(incident.city || incident.address) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={20} color="#2d5a8c" />
                <View style={styles.locationText}>
                  {incident.city && <Text style={styles.locationCity}>{incident.city}</Text>}
                  {incident.address && <Text style={styles.locationAddress}>{incident.address}</Text>}
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{incident.description}</Text>
          </View>

          {/* Información Adicional */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Incidente</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ID del Incidente</Text>
                <Text style={styles.infoValue}>{incident.id}</Text>
              </View>
              {incident.created_at && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Fecha de Creación</Text>
                  <Text style={styles.infoValue}>
                    {new Date(incident.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
              {incident.updated_at && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Última Actualización</Text>
                  <Text style={styles.infoValue}>
                    {new Date(incident.updated_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Recursos Asignados */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recursos Asignados</Text>
            {loadingResources ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2d5a8c" />
                <Text style={styles.loadingText}>Cargando recursos...</Text>
              </View>
            ) : resources.length > 0 ? (
              <View style={styles.resourcesContainer}>
                {resources.map((resource, idx) => (
                  <View key={resource.id || `${resource.type}-${resource.capacity}-${idx}`} style={styles.resourceCard}>
                    <View style={styles.resourceHeader}>
                      <Ionicons 
                        name={resource.type?.toLowerCase().includes('ambulancia') ? 'medkit' : 'cube'} 
                        size={24} 
                        color="#2d5a8c" 
                      />
                      <View style={styles.resourceInfo}>
                        <Text style={styles.resourceType}>{resource.type || 'Recurso'}</Text>
                        <View style={styles.resourceDetails}>
                          <View style={[
                            styles.statusBadgeSmall, 
                            { backgroundColor: resource.status === 'available' ? '#dcfce7' : '#fee2e2' }
                          ]}>
                            <Text style={[
                              styles.statusTextSmall,
                              { color: resource.status === 'available' ? '#16a34a' : '#dc2626' }
                            ]}>
                              {resource.status === 'available' ? 'Disponible' : 'No disponible'}
                            </Text>
                          </View>
                          <Text style={styles.capacityText}>
                            <Ionicons name="people" size={14} color="#6b7280" /> {resource.capacity}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyResources}>
                <Ionicons name="alert-circle-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptyResourcesText}>No hay recursos asignados</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rescatista Asignado</Text>
            <View style={styles.rescuerInfo}>
              <Ionicons name="person-circle" size={40} color="#2d5a8c" />
              <View>
                <Text style={styles.rescuerName}>
                  {incident.assigned_rescuer?.name || "Sin asignar"}
                </Text>
                <Text style={styles.rescuerRole}>Operador de rescate</Text>
              </View>
            </View>
          </View>

          {incident.status !== "RESUELTO" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Agregar Notas</Text>
              <TextInput
                style={styles.input}
                placeholder="Escribe las notas aquí..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                editable={!updating && !sendingNote}
              />
              <TouchableOpacity
                style={[styles.sendNoteButton, (sendingNote || !notes.trim()) && styles.sendNoteButtonDisabled]}
                onPress={handleSendNote}
                disabled={sendingNote || !notes.trim()}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.sendNoteButtonText}>
                  {sendingNote ? "Enviando..." : "Enviar Nota"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {incident.status !== "RESUELTO" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actualizar Estado</Text>
              <View style={styles.buttonGroup}>
                {statusFlow
                  .filter(status => {
                    const currentIdx = statusFlow.indexOf((incident.status as any) || "");
                    const targetIdx = statusFlow.indexOf(status);
                    if (currentIdx === -1) return true; // estado no reconocido, muestra todas
                    return targetIdx > currentIdx; // solo estados futuros
                  })
                  .map(status => {
                    const info = statusColors[status as keyof typeof statusColors];
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[styles.statusButton, { borderColor: info.color }]}
                        onPress={() => handleUpdateStatus(status)}
                        disabled={updating}
                      >
                        <Ionicons name={info.icon as any} size={18} color={info.color} />
                        <Text style={[styles.buttonText, { color: info.color }]}> 
                          {updating ? "..." : info.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#2d5a8c",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2d5a8c",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#f0f4fa",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2d5a8c",
  },
  locationText: {
    flex: 1,
  },
  locationCity: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  infoGrid: {
    backgroundColor: "#f0f4fa",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  resourcesContainer: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2d5a8c",
  },
  resourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  resourceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: "600",
  },
  capacityText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyResources: {
    alignItems: "center",
    padding: 20,
    gap: 8,
  },
  emptyResourcesText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  rescuerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
  },
  rescuerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  rescuerRole: {
    fontSize: 12,
    color: "#9ca3af",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    textAlignVertical: "top",
    marginBottom: 12,
  },
  sendNoteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2d5a8c",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#2d5a8c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendNoteButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  sendNoteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGroup: {
    gap: 8,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#ef4444",
    fontSize: 16,
  },
});