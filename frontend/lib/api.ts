// frontend/lib/api.ts

const API_URL = 'http://localhost:3001';

let authToken: string | null = null;

/**
 * Called once after login
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

function authHeader() {
  if (!authToken) {
    throw new Error('JWT not set. User is not authenticated.');
  }

  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
}

/* ---------------- API KEY / QUOTA ---------------- */

export async function buyApiKey() {
  const res = await fetch(`${API_URL}/auth/api-key/buy`, {
    method: 'POST',
    headers: authHeader(),
  });

  if (!res.ok) throw new Error('Buy key failed');
  return res.json();
}

export async function useApi(apiKey: string) {
  const res = await fetch(`${API_URL}/auth/api-key/use`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) throw new Error('Quota exhausted');
  return res.json();
}

/* ---------------- MONITORING ---------------- */

export async function getJobs() {
  const res = await fetch(`${API_URL}/monitor/jobs`, {
    headers: authHeader(),
  });

  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export async function createJob(payload: any) {
  const res = await fetch(`${API_URL}/monitor/jobs`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to create job');
  return res.json();
}

export async function runOnce(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/run-once`,
    {
      method: 'POST',
      headers: authHeader(),
    }
  );

  if (!res.ok) throw new Error('Run once failed');
  return res.json();
}

export async function getJobRuns(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/runs`,
    {
      headers: authHeader(),
    }
  );

  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function getJobStatus(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/status`,
    {
      headers: authHeader(),
    }
  );

  if (!res.ok) {
    return null; // 👈 prevent crash
  }

  // If backend returns empty body
  const text = await res.text();
  if (!text) return null;

  return JSON.parse(text);
}

export async function getJobIncidents(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/incidents`,
    { headers: authHeader() }
  );

  if (!res.ok) return [];
  return res.json();
}
export async function updateJob(jobId: string, payload: any) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}`,
    {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) throw new Error("Failed to update job");
  return res.json();
}

export async function deleteJob(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}`,
    {
      method: "DELETE",
      headers: authHeader(),
    }
  );

  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

/* ---------------- NOTIFICATION INTEGRATIONS ---------------- */

export async function getIntegrations() {
  const res = await fetch(`${API_URL}/notifications/integrations`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch integrations');
  return res.json();
}

export async function createIntegration(payload: object) {
  const res = await fetch(`${API_URL}/notifications/integrations`, {
    method: 'POST', headers: authHeader(), body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create integration');
  return res.json();
}

export async function updateIntegration(id: string, payload: object) {
  const res = await fetch(`${API_URL}/notifications/integrations/${id}`, {
    method: 'PATCH', headers: authHeader(), body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update integration');
  return res.json();
}

export async function deleteIntegration(id: string) {
  const res = await fetch(`${API_URL}/notifications/integrations/${id}`, {
    method: 'DELETE', headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete integration');
  return res.json();
}

export async function testIntegration(id: string) {
  const res = await fetch(`${API_URL}/notifications/integrations/${id}/test`, {
    method: 'POST', headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to test integration');
  return res.json();
}

/* ---------------- PROVIDER ALERT SUBSCRIPTIONS ---------------- */

export interface ProviderAlertSubscription {
  id: string;
  userId: string;
  providerId: string;
  alertsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getProviderAlertSubscriptions(): Promise<ProviderAlertSubscription[]> {
  const res = await fetch(`${API_URL}/provider-alerts`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch provider alert subscriptions');
  return res.json();
}

export async function setProviderAlert(
  providerId: string,
  alertsEnabled: boolean,
): Promise<ProviderAlertSubscription> {
  const res = await fetch(`${API_URL}/provider-alerts/${providerId}`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ alertsEnabled }),
  });
  if (!res.ok) throw new Error('Failed to update provider alert');
  return res.json();
}