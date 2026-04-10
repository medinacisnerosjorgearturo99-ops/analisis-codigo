'use client';
import { useState } from 'react';
import { HistorialEntry } from '../types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useHistorial(token: string | null) {
  const [entries, setEntries] = useState<HistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      console.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const clear = () => setEntries([]);

  return { entries, loading, fetch: fetch_, clear };
}
