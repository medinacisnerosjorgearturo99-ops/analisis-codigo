'use client';
import { useState } from 'react';
import { AuthMode } from '../types';

interface Props {
  mode: AuthMode;
  error: string;
  loading: boolean;
  onSubmit: (mode: AuthMode, email: string, password: string) => void;
  onSwitchMode: (mode: AuthMode) => void;
  onClose: () => void;
}

export default function AuthModal({ mode, error, loading, onSubmit, onSwitchMode, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = () => {
    setLocalError('');
    if (mode === 'registro' && password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    onSubmit(mode, email, password);
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161920] border border-gray-800 rounded-xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#0d0f14] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#0d0f14] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          {mode === 'registro' && (
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="bg-[#0d0f14] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          )}

          {displayError && (
            <p className="text-red-400 text-xs text-center">{displayError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
              loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-b from-[#2d3a5a] to-[#1e293b] hover:from-[#3b4b7a] text-white border border-blue-900/50'
            }`}
          >
            {loading ? '...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
          </button>

          <p className="text-center text-xs text-gray-500">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'registro' : 'login')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
