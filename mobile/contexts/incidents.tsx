import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Incident {
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
}

interface IncidentsContextType {
  incidents: Incident[];
  setIncidents: (incidents: Incident[]) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  updateIncidentStatus: (id: string, newStatus: string) => void;
  updateIncidentRescuer: (id: string, rescuerId: string) => void;
}

const IncidentsContext = createContext<IncidentsContextType | undefined>(undefined);

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
    updateIncident(id, { status: newStatus });
  }, [updateIncident]);

  const updateIncidentRescuer = useCallback((id: string, rescuerId: string) => {
    updateIncident(id, { assigned_rescuer: { name: rescuerId } });
  }, [updateIncident]);

  return (
    <IncidentsContext.Provider
      value={{
        incidents,
        setIncidents,
        updateIncident,
        updateIncidentStatus,
        updateIncidentRescuer,
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
