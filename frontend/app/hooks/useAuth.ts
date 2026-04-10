'use client';
import { useState, useEffect } from 'react';
import { AuthMode } from '../types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AuthState {
  token: string | null;
  email: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ token: null, email: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    if (token && email) setAuth({ token, email });
  }, []);

  const clearError = () => setError('');

  const submit = async (mode: AuthMode, email: string, password: string): Promise<boolean> => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/registro';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Error al autenticar.');
        return false;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      setAuth({ token: data.token, email: data.email });
      return true;
    } catch {
      setError('Error al conectar con el servidor.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setAuth({ token: null, email: null });
  };

  return {
    token: auth.token,
    email: auth.email,
    isAuthenticated: !!auth.token,
    authLoading: loading,
    authError: error,
    clearError,
    submit,
    logout,
  };
}
