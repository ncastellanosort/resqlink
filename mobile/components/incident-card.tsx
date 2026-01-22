import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Incident {
  id: string;
  title: string;
  status: string;
  incident_type: string;
  assigned_rescuer?: { name: string };
}

const statusColors = {
  EN_CAMINO: { color: "#6366f1", bgColor: "#e0e7ff", icon: "car" as const, label: "En Camino" },
  ASIGNADO: { color: "#3b82f6", bgColor: "#dbeafe", icon: "checkmark-circle" as const, label: "Asignado" },
  EN_ATENCION: { color: "#f59e0b", bgColor: "#fef3c7", icon: "navigate" as const, label: "En Atención" },
  RESUELTO: { color: "#10b981", bgColor: "#d1fae5", icon: "checkmark-done" as const, label: "Resuelto" },
};

const incidentTypeIcons = {
  MEDICAL: { icon: "medical" as const, color: "#ec4899" },
  FIRE: { icon: "flame" as const, color: "#f97316" },
  RESCUE: { icon: "shield-checkmark" as const, color: "#6366f1" },
};

export function IncidentCard({ incident }: { incident: Incident }) {
  const statusInfo = statusColors[incident.status as keyof typeof statusColors] || statusColors.EN_CAMINO;
  const typeInfo = incidentTypeIcons[incident.incident_type as keyof typeof incidentTypeIcons] || incidentTypeIcons.RESCUE;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + "20" }]}>
          <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{incident.title}</Text>
          <Text style={styles.typeLabel}>{incident.incident_type}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.infoRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Ionicons name={statusInfo.icon} size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-circle" size={18} color="#9ca3af" />
          <Text style={styles.infoLabel}>
            {incident.assigned_rescuer?.name || "Sin asignar"}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.indicator, { backgroundColor: statusInfo.color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#2d5a8c",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#2d5a8c",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  footer: {
    height: 4,
    backgroundColor: "#f3f4f6",
  },
  indicator: {
    height: 4,
  },
});
