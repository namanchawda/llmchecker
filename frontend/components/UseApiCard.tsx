'use client';

import { useState } from 'react';
import { useApi } from '../lib/api';

export function UseApiCard({
  apiKey,
  initialQuota,
}: {
  apiKey: string;
  initialQuota: number;
}) {
  const [quota, setQuota] = useState(initialQuota);

  async function handleUse() {
    const data = await useApi(apiKey);
    setQuota(data.remainingQuota);
  }

  return (
    <div className="card">
      <h3>Use API</h3>

      <button
        disabled={quota === 0}
        onClick={handleUse}
      >
        {quota > 0
          ? `Use API (${quota})`
          : 'Your API-key quota is over'}
      </button>
    </div>
  );
}
