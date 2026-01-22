import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import IncidentListScreen from "@/screens/incident-list-screen";
import IncidentDetailScreen from "@/screens/incident-detail-screen";

type Incident = {
  id: string;
  title: string;
  status: string;
  incident_type: string;
  description?: string;
  severity?: string;
  city?: string;
  address?: string;
  assigned_rescuer?: { name: string };
};

export type RootStackParamList = {
  IncidentList: undefined;
  IncidentDetail: { incident: Incident };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="IncidentList">
      <Stack.Screen
        name="IncidentList"
        component={IncidentListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IncidentDetail"
        component={IncidentDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}