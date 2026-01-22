import React, { useEffect, useState, useCallback } from "react";
import { SafeAreaView, FlatList, TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { IncidentCard } from "@/components/incident-card";
import { RootStackParamList } from "@/navigation/app-navigator";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { websocketService } from "../services/websocket";

const API_URL = "https://f93e1a5aa39c.ngrok-free.app";

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

type Incident = {
  id: string;
  title: string;
  status: string;
  incident_type: string;
  description: string;
  severity: string;
  city: string;
  address: string;
  created_at: string;
  updated_at: string;
  assigned_rescuer?: { name: string };
};

type IncidentListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "IncidentList"
>;

const decodeToken = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (error) {
    return null;
  }
};

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
    status: mapStatus(apiIncident.status),
    incident_type: apiIncident.type.toUpperCase(),
    description: apiIncident.description,
    severity: apiIncident.severity,
    city: apiIncident.city,
    address: apiIncident.address,
    created_at: apiIncident.created_at,
    updated_at: apiIncident.updated_at,
    assigned_rescuer: apiIncident.assigned_to ? { name: apiIncident.assigned_to } : undefined,
  };
};

export default function IncidentListScreen() {
  const navigation = useNavigation<IncidentListScreenNavigationProp>();
  const [userName, setUserName] = useState<string>("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const decoded = token ? decodeToken(token) : null;
      const currentUserName = decoded ? (decoded.name || decoded.email || decoded.sub) : '';
      
      const res = await fetch(`${API_URL}/incidents/get-incident-by-rescuer`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!res.ok) {
        throw new Error('No se pudieron cargar los incidentes');
      }

      const data: ApiIncident[] = await res.json();
      setIncidents(Array.isArray(data) ? data.map(incident => ({
        ...mapApiIncident(incident),
        assigned_rescuer: incident.assigned_to ? { name: currentUserName } : undefined,
      })) : []);
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = decodeToken(token);
          if (decoded) {
            const name = decoded.name || decoded.email || decoded.sub;
            setUserName(name || '');
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchIncidents();
    }, [fetchIncidents])
  );

  // Listen for WebSocket rescuer_assigned events to reload incidents
  useEffect(() => {
    const unsubscribe = websocketService.onEvent("rescuer_assigned", (payload: any) => {
      console.log('[IncidentList] Rescuer assigned event received:', payload);
      // Reload incidents when a rescuer is assigned
      fetchIncidents();
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [fetchIncidents]);

  return (
    <LinearGradient
      colors={["#f0f4fa", "#ffffff"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mis Incidentes</Text>
            <Text style={styles.headerSubtitle}>{userName}</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="alert-circle" size={32} color="#2d5a8c" />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{incidents.length}</Text>
            <Text style={styles.statLabel}>Asignados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{incidents.filter(i => i.status !== "RESUELTO").length}</Text>
            <Text style={styles.statLabel}>En Proceso</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2d5a8c" />
            <Text style={styles.loadingText}>Cargando incidentes...</Text>
          </View>
        ) : incidents.length > 0 ? (
          <FlatList
            data={incidents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("IncidentDetail", { incident: item })
                }
                activeOpacity={0.7}
              >
                <IncidentCard incident={item} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.emptyStateText}>¡Sin incidentes!</Text>
            <Text style={styles.emptyStateSubtext}>No tienes incidentes asignados en este momento</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0ecf8",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0ecf8",
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#2d5a8c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#2d5a8c",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2d5a8c",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
});