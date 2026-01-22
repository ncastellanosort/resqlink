'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Incident {
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

interface IncidentsContextType {
  incidents: Incident[];
  setIncidents: (incidents: Incident[]) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  updateIncidentStatus: (id: string, newStatus: string) => void;
  updateIncidentRescuer: (id: string, rescuerId: string) => void;
  applySocketMessage?: (payload: { event: string; incident_id: string; data?: any }) => void;
}

const IncidentsContext = createContext<IncidentsContextType | undefined>(undefined);

const mapStatus = (status: string): string => {
  const normalized = status.toUpperCase();
  if (normalized === 'POR_ASIGNAR') return 'NO_ASIGNADO';
  if (normalized === 'EN_PROGRESO') return 'EN_ATENCION';
  return normalized;
};

export const IncidentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const updateIncident = useCallback((id: string, updates: Partial<Incident>) => {
    setIncidents(prev =>
      prev.map(incident =>
        incident.id === id ? { ...incident, ...updates, updated_at: new Date().toISOString() } : incident
      )
    );
  }, []);

  const updateIncidentStatus = useCallback((id: string, newStatus: string) => {
    updateIncident(id, { status: mapStatus(newStatus) });
  }, [updateIncident]);

  const updateIncidentRescuer = useCallback((id: string, rescuerId: string) => {
    updateIncident(id, { assigned_to: rescuerId });
  }, [updateIncident]);

  const applySocketMessage = useCallback((payload: { event: string; incident_id: string; data?: any }) => {
    if (!payload?.incident_id) return;
    const { event, incident_id, data } = payload;
    
    // Manejar actualización de estado (con new_status)
    if (event === 'incident_status_updated' && data?.new_status) {
      updateIncidentStatus(incident_id, String(data.new_status));
    }
    
    // Manejar asignación de rescatista
    if (event === 'rescuer_assigned') {
      const updates: any = {};
      if (data?.rescuer_id) {
        updates.assigned_to = data.rescuer_id;
      }
      // Manejar status inicial (ej: "asignado") o new_status (EN_CAMINO, EN_ATENCION, RESUELTO)
      const statusValue = data?.new_status || data?.status;
      if (statusValue) {
        updates.status = mapStatus(String(statusValue));
      }
      if (Object.keys(updates).length > 0) {
        updateIncident(incident_id, updates);
      }
    }
    // Add other events here as needed (resources_assigned, field_note_added, etc.)
  }, [updateIncidentStatus, updateIncident]);

  return (
    <IncidentsContext.Provider
      value={{
        incidents,
        setIncidents,
        updateIncident,
        updateIncidentStatus,
        updateIncidentRescuer,
        applySocketMessage,
      }}
    >
      {children}
    </IncidentsContext.Provider>
  );
};

export const useIncidents = () => {
  const context = useContext(IncidentsContext);
  if (!context) {
    throw new Error('useIncidents must be used within IncidentsProvider');
  }
  return context;
};
