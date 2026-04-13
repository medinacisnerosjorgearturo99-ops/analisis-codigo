'use client';
import { useState } from 'react';
import { AnalysisResult, StepState } from '../types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SONAR_BASE = process.env.NEXT_PUBLIC_SONAR_URL || 'http://localhost:9000';

const STEP_COUNT = 5;

export function useAnalysis(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [steps, setSteps] = useState<Record<number, StepState>>({});
  const [currentMessage, setCurrentMessage] = useState('');

  const stepsCompleted = Object.values(steps).filter((s) => s.completado).length;
  const progress = Math.round((stepsCompleted / STEP_COUNT) * 100);

  const reset = () => {
    setResult(null);
    setSteps({});
    setCurrentMessage('');
  };

  const run = (endpoint: string, options: RequestInit) => {
    setLoading(true);
    reset();
    setCurrentMessage('Conectando con el servidor...');

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API}${endpoint}`, { ...options, headers })
      .then((response) => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) { setLoading(false); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event = JSON.parse(line.slice(6));
                if (event.paso) {
                  setCurrentMessage(event.mensaje);
                  setSteps((prev) => ({
                    ...prev,
                    [event.paso]: {
                      completado: event.completado,
                      activo: !event.completado,
                      mensaje: event.mensaje,
                      error: event.error || false,
                    },
                  }));
                }
                if (event.finalizado) {
                  setLoading(false);
                  if (event.sonar_url) {
                    event.sonar_url = event.sonar_url.replace(
                      'http://localhost:9000',
                      SONAR_BASE,
                    );
                  }
                  setResult(event as AnalysisResult);
                }
              } catch { /* malformed SSE line — skip */ }
            }
            read();
          });
        };
        read();
      })
      .catch(() => {
        setLoading(false);
        setResult({ status: 'error', mensaje: 'Error al conectar con el servidor.' });
      });
  };

  return { loading, result, steps, currentMessage, progress, reset, run };
}