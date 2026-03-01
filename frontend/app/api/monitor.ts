// frontend/app/api/monitor.ts

const API_URL = 'http://localhost:3001';

/**
 * Safely get JWT token from browser storage
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const authRaw = localStorage.getItem('auth');
  if (!authRaw) return null;

  try {
    const auth = JSON.parse(authRaw);
    return auth.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Build Authorization header
 */
function authHeader(): Record<string, string> {
  const token = getToken();

  if (!token) {
    console.warn('⚠️ No JWT token found in localStorage');
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch all jobs for logged-in user
 */
export async function getJobs() {
  const res = await fetch(`${API_URL}/monitor/jobs`, {
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch jobs');
  }

  return res.json();
}

/**
 * Create a new monitoring job
 */
export async function createJob(data: {
  provider: string;
  model: string;
  apiKey: string;
  intervalSeconds: number;
  prompt: string;
}) {
  const res = await fetch(`${API_URL}/monitor/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

/**
 * Run a job once manually
 */
export async function runOnce(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/run-once`,
    {
      method: 'POST',
      headers: {
        ...authHeader(),
      },
    },
  );

  return res.json();
}

/**
 * Get all runs for a job
 */
export async function getJobRuns(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/runs`,
    {
      headers: {
        ...authHeader(),
      },
    },
  );

  if (!res.ok) {
    throw new Error('Failed to fetch job runs');
  }

  return res.json();
}

/**
 * Get latest run for a job
 */
export async function getLatestRun(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/runs/latest`,
    {
      headers: {
        ...authHeader(),
      },
    },
  );

  return res.json();
}

/**
 * Disable a cron job (pause)
 */
export async function disableJob(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/disable`,
    {
      method: 'POST',
      headers: {
        ...authHeader(),
      },
    },
  );

  if (!res.ok) {
    throw new Error('Failed to disable job');
  }

  return res.json();
}

/**
 * Enable a cron job (resume)
 */
export async function enableJob(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/enable`,
    {
      method: 'POST',
      headers: {
        ...authHeader(),
      },
    },
  );

  if (!res.ok) {
    throw new Error('Failed to enable job');
  }

  return res.json();
}

/**
 * Get current status for a job (prompt_monitor_status table)
 */
export async function getJobStatus(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/status`,
    {
      headers: authHeader(),
    }
  );

  if (!res.ok) return null;

  const text = await res.text();

  if (!text) return null;

  return JSON.parse(text);
}

export async function getJobIncidents(jobId: string) {
  const res = await fetch(
    `${API_URL}/monitor/jobs/${jobId}/incidents`,
    { headers: authHeader() }
  );

  return res.json();
}

/**
 * Toggle alerts on/off for a specific scheduler
 */
export async function toggleJobAlerts(jobId: string, alertsEnabled: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/monitor/jobs/${jobId}/alerts`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
    },
    body: JSON.stringify({ alertsEnabled }),
  });

  if (!res.ok) {
    throw new Error('Failed to toggle alerts');
  }
}