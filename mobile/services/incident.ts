export async function getMyIncidents() {
  const res = await fetch("/api/incidents?assigned_to=me");
  return res.json();
}

export async function getIncidentById(id: string) {
  const res = await fetch(`/api/incidents/${id}`);
  return res.json();
}

export async function updateIncidentStatus(id: string, body: { status: string; notes?: string }) {
  const res = await fetch(`/api/incidents/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}