'use client';

import { useState } from 'react';
import { buyApiKey } from '../lib/api';

export function ApiKeyCard({ jwt }: { jwt: string }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [quota, setQuota] = useState<number>(0);

  async function handleBuy() {
    const data = await buyApiKey();
    setApiKey(data.apiKey);
    setQuota(data.apiKeyQuota);
  }

  return (
    <div className="card">
      <h3>API Key</h3>

      {!apiKey ? (
        <button onClick={handleBuy}>Buy API Key</button>
      ) : (
        <>
          <div><b>Key:</b> {apiKey}</div>
          <div><b>Quota:</b> {quota}</div>
        </>
      )}
    </div>
  );
}
