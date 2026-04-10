'use client';
import { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SONAR_BASE = process.env.NEXT_PUBLIC_SONAR_URL || 'http://localhost:9000';

const PASOS = [
  { id: 1, label: 'Preparando archivos' },
  { id: 2, label: 'Ejecutando SonarQube Scanner' },
  { id: 3, label: 'Procesando resultados' },
  { id: 4, label: 'Obteniendo métricas' },
  { id: 5, label: 'Generando recomendaciones con IA' },
];

function guessLanguage(code: string): { ext: string; label: string } {
  const c = code.trim();
  if (c.includes(': string') || c.includes(': number') || c.includes('interface ') ||
      c.includes('useState<') || c.includes(': void'))
    return { ext: 'ts', label: 'TypeScript' };
  if (c.includes('import React') || c.includes('useState') || c.includes('useEffect'))
    return { ext: 'jsx', label: 'JavaScript (React)' };
  if (c.includes('def ') || c.includes('print(') || c.includes('if __name__'))
    return { ext: 'py', label: 'Python' };
  if (c.includes('public class') || c.includes('System.out') || c.includes('import java.'))
    return { ext: 'java', label: 'Java' };
  if (c.includes('namespace ') || c.includes('Console.Write') || c.includes('using System'))
    return { ext: 'cs', label: 'C#' };
  if (c.includes('<?php') || c.includes('$_GET') || c.includes('$_POST'))
    return { ext: 'php', label: 'PHP' };
  if (c.includes('<!DOCTYPE') || c.includes('<html') || c.includes('<body'))
    return { ext: 'html', label: 'HTML' };
  if (c.includes('{') && (c.includes('color:') || c.includes('margin:') || c.includes('padding:')))
    return { ext: 'css', label: 'CSS' };
  if (c.startsWith('<?xml') || c.startsWith('<project'))
    return { ext: 'xml', label: 'XML' };
  if (c.startsWith('---') || /^\w+:\s+\w+/m.test(c))
    return { ext: 'yaml', label: 'YAML' };
  return { ext: 'js', label: 'JavaScript' };
}

function isRepoUrl(text: string): boolean {
  const t = text.trim();
  return t.startsWith('https://github.com') || t.startsWith('https://gitlab.com') ||
    t.startsWith('https://bitbucket.org') || t.startsWith('git@');
}

interface PasoEstado {
  completado: boolean;
  activo: boolean;
  mensaje: string;
  error: boolean;
}

interface HistorialEntry {
  id: number;
  proyecto: string;
  bugs: string;
  vulnerabilidades: string;
  code_smells: string;
  sonar_url: string;
  fecha: string;
}

export default function Home() {
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasos, setPasos] = useState<Record<number, PasoEstado>>({});
  const [mensajeActual, setMensajeActual] = useState('');

  // Auth
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'login' | 'registro'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirm, setAuthConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Historial
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar sesión guardada
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedEmail = localStorage.getItem('email');
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]); setTextContent(''); setResult(null);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]); setTextContent(''); setResult(null);
    }
  };

  // Auth handlers
  const handleAuth = async () => {
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError('Email y contraseña son requeridos.'); return;
    }
    if (modalMode === 'registro') {
      if (authPassword !== authConfirm) {
        setAuthError('Las contraseñas no coinciden.'); return;
      }
      if (authPassword.length < 6) {
        setAuthError('La contraseña debe tener al menos 6 caracteres.'); return;
      }
    }

    setAuthLoading(true);
    try {
      const endpoint = modalMode === 'login' ? '/auth/login' : '/auth/registro';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || 'Error al autenticar.'); return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      setToken(data.token);
      setEmail(data.email);
      setShowModal(false);
      setAuthEmail(''); setAuthPassword(''); setAuthConfirm('');
    } catch {
      setAuthError('Error al conectar con el servidor.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setToken(null);
    setEmail(null);
    setShowHistorial(false);
    setHistorial([]);
  };

  const cargarHistorial = async () => {
    if (!token) return;
    setHistorialLoading(true);
    try {
      const res = await fetch(`${API}/historial`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setHistorial(data);
    } catch {
      console.error('Error cargando historial');
    } finally {
      setHistorialLoading(false);
    }
  };

  const toggleHistorial = () => {
    if (!showHistorial) cargarHistorial();
    setShowHistorial(!showHistorial);
  };

  // Análisis con SSE
  const procesarSSE = (endpoint: string, options: RequestInit) => {
    setLoading(true);
    setResult(null);
    setPasos({});
    setMensajeActual('Conectando con el servidor...');

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`${API}${endpoint}`, { ...options, headers })
      .then(response => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const leer = () => {
          reader.read().then(({ done, value }) => {
            if (done) { setLoading(false); return; }
            buffer += decoder.decode(value, { stream: true });
            const lineas = buffer.split('\n\n');
            buffer = lineas.pop() || '';

            for (const linea of lineas) {
              if (!linea.startsWith('data: ')) continue;
              try {
                const evento = JSON.parse(linea.slice(6));
                if (evento.paso) {
                  setMensajeActual(evento.mensaje);
                  setPasos(prev => ({
                    ...prev,
                    [evento.paso]: {
                      completado: evento.completado,
                      activo: !evento.completado,
                      mensaje: evento.mensaje,
                      error: evento.error || false,
                    }
                  }));
                }
                if (evento.finalizado) {
                  setLoading(false);
                  if (evento.sonar_url) {
                    evento.sonar_url = evento.sonar_url.replace('http://localhost:9000', SONAR_BASE);
                  }
                  setResult(evento);
                }
              } catch {}
            }
            leer();
          });
        };
        leer();
      })
      .catch(() => {
        setLoading(false);
        setResult({ status: 'error', mensaje: 'Error al conectar con el servidor.' });
      });
  };

  const handleAnalyze = () => {
    if (!file && !textContent.trim()) {
      alert('⚠️ Por favor, pega código, una URL de repositorio, o sube un archivo .zip.');
      return;
    }
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      procesarSSE('/upload', { method: 'POST', body: formData });
    } else if (isRepoUrl(textContent)) {
      procesarSSE('/analyze-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: textContent.trim() }),
      });
    } else {
      const lang = guessLanguage(textContent);
      procesarSSE('/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: textContent, language: lang.ext }),
      });
    }
  };

  const detectedLang = textContent.trim() && !isRepoUrl(textContent)
    ? guessLanguage(textContent) : null;
  const modeLabel = file
    ? `📦 ${file.name}`
    : textContent.trim()
      ? isRepoUrl(textContent) ? '🔗 Repositorio detectado' : `📝 ${detectedLang?.label} detectado`
      : null;

  const pasosCompletados = Object.values(pasos).filter(p => p.completado).length;
  const porcentaje = Math.round((pasosCompletados / PASOS.length) * 100);

  // Simular severidad basándose en números para etiquetas visuales
  const getBugsStatus = (num: number) => num > 0 ? "Crítico" : "¡Excelente!";
  const getSmellsStatus = (num: number) => num > 0 ? "Mejoras de mantenimiento" : "¡Excelente!";

  return (
    // 1. EL FONDO ESPACIAL CON DESTELLO AZUL
    <main className="min-h-screen bg-[#050810] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#050810] to-[#050810] text-white font-sans flex flex-col items-center">
      
      {/* 2. LA BARRA DE NAVEGACIÓN (NAVBAR) - Se mantiene el original */}
      <nav className="w-full max-w-7xl flex justify-between items-center p-6 mb-4 md:mb-10">
        <div className="flex items-center gap-3 font-bold text-xl tracking-wide">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
             <span className="text-white text-lg">♻️</span> 
          </div>
          <span>Analizador</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#" className="text-blue-400 border-b-2 border-blue-500 pb-1">Analizar</a>
          <button onClick={toggleHistorial} className="text-gray-400 hover:text-gray-200 transition-colors">Historial</button>
          <a href="#" className="text-gray-400 hover:text-gray-200 transition-colors">Documentación</a>
        </div>
        <div>
          {token ? (
            <div className="flex items-center gap-4">
              <span className="hidden md:inline text-xs text-gray-400">{email}</span>
              <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Cerrar sesión</button>
            </div>
          ) : (
            <button onClick={() => { setShowModal(true); setModalMode('login'); }} className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 px-5 py-2 rounded-full text-sm font-medium transition-all">Iniciar sesión</button>
          )}
        </div>
      </nav>

      {/* 3. CONTENIDO PRINCIPAL - LAYOUT DE DOS COLUMNAS CUANDO HAY RESULTADO */}
      <div className={`w-full max-w-7xl px-4 flex flex-col items-center animate-fade-in-up ${result ? 'flex-col' : ''}`}>
        
        {/* Encabezado dinámico */}
        {!result && (
          <>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-md text-center">ANALIZADOR DE CÓDIGO</h1>
            <p className="text-gray-400 mb-6 text-center text-sm md:text-base">Sube un .zip, pega código, o ingresa la URL de un repositorio de GitHub.</p>
            {!token && (
              <p className="text-gray-500 mb-8 text-sm text-center">💡 <button onClick={() => { setShowModal(true); setModalMode('registro'); }} className="text-blue-400 underline decoration-blue-900 underline-offset-4 hover:text-blue-300 transition-colors">Crea una cuenta</button> para guardar tu historial de análisis</p>
            )}
          </>
        )}

        {/* Layout Condicional: Un contenedor ancho para input/progreso, Grid para resultados */}
        {(!result) ? (
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Historial (sección colapsable) */}
            {showHistorial && (
              <div className="w-full bg-[#161920]/90 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-8 shadow-2xl">
                <h2 className="text-sm font-bold text-gray-300 tracking-widest uppercase mb-4">📋 Últimos análisis</h2>
                {historialLoading ? <p className="text-gray-500 text-sm text-center">Cargando...</p> : historial.length === 0 ? <p className="text-gray-500 text-sm text-center">No tienes análisis guardados aún.</p> : (
                  <div className="flex flex-col gap-3">
                    {historial.map(entry => (
                      <div key={entry.id} className="bg-[#0d0f14] border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-sm">{entry.proyecto}</p>
                          <p className="text-gray-500 text-xs mt-1">{entry.fecha}</p>
                          <div className="flex gap-3 mt-2">
                            <span className="text-red-400 text-xs">🐛 {entry.bugs}</span>
                            <span className="text-orange-400 text-xs">🔓 {entry.vulnerabilidades}</span>
                            <span className="text-yellow-400 text-xs">🤢 {entry.code_smells}</span>
                          </div>
                        </div>
                        {entry.sonar_url && <a href={entry.sonar_url.replace('http://localhost:9000', SONAR_BASE)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-white border border-gray-700 hover:border-blue-500 px-3 py-1 rounded-full transition-all">Ver →</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Caja de Input (Glassmorphism) */}
            <div className="w-full bg-[#0f1423]/80 backdrop-blur-md border border-gray-800/60 p-4 rounded-2xl shadow-2xl relative mb-12">
              {modeLabel && !loading && <div className="w-full mb-3 text-center text-xs text-blue-400 font-semibold tracking-wider">{modeLabel}</div>}
              {!loading && (
                <div className={`relative w-full bg-[#070a13] border rounded-xl p-4 min-h-[220px] flex flex-col justify-between group transition-all ${isDragging ? 'border-blue-500 scale-[1.01] bg-[#0c1222]' : 'border-gray-800/40 focus-within:border-blue-900/50'}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  {file ? (
                    <div className="flex flex-col items-center text-center p-6"><span className="text-5xl mb-4 drop-shadow-md">📦</span><p className="text-green-400 font-bold text-lg mb-2">{file.name}</p><button onClick={() => { setFile(null); }} className="text-gray-500 hover:text-red-400 text-sm underline mt-2">Quitar archivo y volver a modo texto</button></div>
                  ) : (
                    <textarea value={textContent} onChange={(e) => { setTextContent(e.target.value); }} placeholder="Pega tu código aquí, o escribe la URL de un repositorio&#10;(https://github.com/usuario/repo)..." className="w-full h-full bg-transparent text-gray-300 placeholder-gray-600 resize-none outline-none text-sm font-mono z-10" />
                  )}
                  {!file && <div className="absolute bottom-4 right-4 z-20"><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-[#1a2235] hover:bg-[#232d45] border border-gray-700/50 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-all"><span>📁</span> Buscar .zip en PC</button></div>}
                  {isDragging && <div className="absolute inset-0 bg-blue-900/20 flex items-center justify-center rounded-xl z-30 backdrop-blur-sm"><span className="text-xl font-bold text-blue-400 pointer-events-none drop-shadow-md">¡Suelta tu archivo aquí! ⏬</span></div>}
                </div>
              )}
              {/* Progreso */}
              {loading && (
                <div className="w-full py-4 px-2">
                  <div className="w-full bg-gray-800/50 rounded-full h-2 mb-6 overflow-hidden border border-gray-700/30"><div className="bg-blue-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${porcentaje}%` }} /></div>
                  <p className="text-center text-blue-400 text-sm font-semibold mb-6 tracking-wide drop-shadow-sm">{mensajeActual}</p>
                  <div className="flex flex-col gap-3">
                    {PASOS.map(paso => {
                      const estado = pasos[paso.id];
                      const completado = estado?.completado; const activo = estado?.activo; const error = estado?.error;
                      return (<div key={paso.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${completado && !error ? 'bg-green-900/20 border border-green-900/30' : error ? 'bg-red-900/20 border border-red-900/30' : activo ? 'bg-blue-900/20 border border-blue-900/30' : 'bg-gray-900/20 border border-gray-800/50'}`}><span className="text-xl">{completado && !error ? '✅' : error ? '❌' : activo ? '⏳' : '⬜'}</span><span className={`text-sm font-medium ${completado && !error ? 'text-green-400' : error ? 'text-red-400' : activo ? 'text-blue-400' : 'text-gray-600'}`}>{estado?.mensaje || paso.label}</span></div>);
                    })}
                  </div>
                </div>
              )}
              {/* Botón Principal Analizar */}
              {!loading && (
                <div className="mt-6 flex justify-center pb-2"><button onClick={handleAnalyze} className="bg-gradient-to-b from-[#1c263c] to-[#0d121f] hover:from-[#24314d] hover:to-[#12192b] border border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.5)] text-white px-10 py-3 rounded-lg font-bold tracking-widest text-sm transition-all transform hover:scale-[1.02] active:scale-95">ANALIZAR CÓDIGO</button></div>
              )}
            </div>
          </div>
        ) : (
          /* ✨ ✨ ✨ EL NUEVO LAYOUT DE RESULTADOS (2 Columnas) ✨ ✨ ✨ */
          <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-[1fr,320px] gap-8 mb-16 items-start">
            
            {/* ⬅️ COLUMNA IZQUIERDA (Ancha): Tarjetas Refinadas + IA Estructurada */}
            <div className="flex flex-col gap-6">
              
              {/* Título de Resultados y Metadatos */}
              <div className="flex justify-between items-center mb-2 px-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setResult(null); setPasos({}); }} className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors">← Volver al analizador</button>
                    <h1 className="text-3xl font-extrabold text-gray-200">Análisis completado</h1>
                    <span className="text-xl">✅</span>
                </div>
                {/* Metadatos hardcodeados */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">🗓️ <span className="text-gray-400">12 may 2024, 14:32</span></span>
                    <span className="flex items-center gap-1 bg-gray-900/70 p-2 rounded-lg border border-gray-800">ID: <span className="text-blue-400 font-mono">a7f3b2c</span></span>
                </div>
              </div>

              {/* ✨ TARJETAS DE MÉTRICAS REFINADAS (en una fila) */}
              {result.stats && Object.keys(result.stats).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Tarjeta Bugs */}
                  <div className="bg-[#070a13] border border-red-900/60 p-5 rounded-2xl flex items-center gap-4 group hover:border-red-500/80 transition-colors shadow-xl shadow-red-950/20">
                    <div className="w-12 h-12 bg-red-950/50 border border-red-900/50 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"><span className="text-2xl drop-shadow-md">🐛</span></div>
                    <div className="flex-1 flex flex-col items-center">
                        <h3 className="text-red-400 font-bold tracking-widest text-xs uppercase">Bugs</h3>
                        <p className="text-4xl font-extrabold text-white mt-1 leading-none">{result.stats.bugs ?? '0'}</p>
                        <span className={`text-[11px] px-2 py-0.5 mt-1.5 rounded-full font-bold uppercase
                            ${result.stats.bugs > 0 ? 'bg-red-900/30 text-red-300 border border-red-800/40' : 'bg-green-900/30 text-green-300 border border-green-800/40'}`}>
                            {getBugsStatus(result.stats.bugs)}
                        </span>
                    </div>
                  </div>

                  {/* Tarjeta Vulnerabilidades */}
                  <div className="bg-[#070a13] border border-orange-900/60 p-5 rounded-2xl flex items-center gap-4 group hover:border-orange-500/80 transition-colors shadow-xl shadow-orange-950/20">
                    <div className="w-12 h-12 bg-orange-950/50 border border-orange-900/50 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"><span className="text-2xl drop-shadow-md">🔓</span></div>
                    <div className="flex-1 flex flex-col items-center">
                        <h3 className="text-orange-400 font-bold tracking-widest text-xs uppercase">Vulnerabilidades</h3>
                        <p className="text-4xl font-extrabold text-white mt-1 leading-none">{result.stats.vulnerabilities ?? '0'}</p>
                        <span className={`text-[11px] px-2 py-0.5 mt-1.5 rounded-full font-bold uppercase
                            ${result.stats.vulnerabilities > 0 ? 'bg-orange-900/30 text-orange-300 border border-orange-800/40' : 'bg-green-900/30 text-green-300 border border-green-800/40'}`}>
                            {result.stats.vulnerabilities > 0 ? 'Crítico' : '¡Excelente!'}
                        </span>
                    </div>
                  </div>

                  {/* Tarjeta Code Smells */}
                  <div className="bg-[#070a13] border border-yellow-900/60 p-5 rounded-2xl flex items-center gap-4 group hover:border-yellow-500/80 transition-colors shadow-xl shadow-yellow-950/20">
                    <div className="w-12 h-12 bg-yellow-950/50 border border-yellow-900/50 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"><span className="text-2xl drop-shadow-md">🤢</span></div>
                    <div className="flex-1 flex flex-col items-center">
                        <h3 className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Code Smells</h3>
                        <p className="text-4xl font-extrabold text-white mt-1 leading-none">{result.stats.code_smells ?? '0'}</p>
                        <span className={`text-[11px] px-2 py-0.5 mt-1.5 rounded-full font-bold uppercase
                            ${result.stats.code_smells > 0 ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/40' : 'bg-green-900/30 text-green-300 border border-green-800/40'}`}>
                            {getSmellsStatus(result.stats.code_smells)}
                        </span>
                    </div>
                  </div>

                </div>
              )}

              {/* Banner de éxito sutil */}
              {result.status === 'success' && result.stats.bugs === 0 && (
                <div className="p-4 bg-green-950/30 border border-green-800/50 rounded-2xl flex items-center gap-3 shadow-lg shadow-green-950/10">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-green-300 font-medium">¡Buen trabajo! <span className="font-bold">Tu código está en buen estado.</span> Solo encontramos 1 problema menor que puedes mejorar.</p>
                </div>
              )}

              {/* ✨ ✨ ✨ RECOMENDACIONES DE IA ULTRA ESTRUCTURADAS ✨ ✨ ✨ */}
              {result.ai_recomendaciones && (
                <div className="w-full bg-[#070a13] backdrop-blur-md border border-purple-900/50 rounded-2xl p-6 shadow-2xl relative">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-950/50 border border-purple-900/50 rounded-lg flex items-center justify-center shadow-md"><span className="text-2xl drop-shadow-md">🤖</span></div>
                    <div>
                        <h3 className="text-purple-400 font-bold tracking-widest text-xs uppercase">Recomendaciones de IA</h3>
                        <p className="text-gray-500 text-xs mt-0.5">Análisis con SonarQube - Proyecto '<span className="text-gray-400 font-semibold">{project_key}</span>'</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    
                    {/* 1. Estado General */}
                    <section>
                        <h4 className="text-purple-300 font-bold mb-3">1. Estado General del Código</h4>
                        <p className="border-l-4 border-purple-900 pl-4 py-1.5 bg-purple-950/10 rounded-r-lg">El proyecto tiene una excelente calidad general, con cero vulnerabilidades y code smells. Solo presenta un bug menor relacionado con accesibilidad que debe corregirse.</p>
                    </section>

                    {/* 2. Problemas Principales ( Hardcodeado para el ejemplo de la imagen) */}
                    <section>
                        <h4 className="text-purple-300 font-bold mb-3">2. Problemas Principales y Soluciones</h4>
                        
                        {/* Bloque estructurado del problema Crítico */}
                        <div className="bg-[#0f1423] border border-gray-800/60 rounded-xl p-5 mb-4 shadow-inner">
                            {/* Encabezado del problema */}
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-800/60 pb-4">
                                <span className="bg-red-900/50 text-red-300 border border-red-800/40 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Crítico</span>
                                <p className="text-sm text-white font-semibold flex-1">Falta de atributo alt en imagen</p>
                                <span className="bg-blue-900/20 text-blue-300 border border-blue-900/30 text-[10px] px-2 py-0.5 rounded-full font-bold">Accesibilidad</span>
                                <span className="text-xs text-gray-600 font-mono tracking-wider bg-gray-900/60 p-1.5 rounded-lg border border-gray-800">index.html:13</span>
                            </div>

                            <p className="text-xs text-gray-500 mb-3 leading-snug">La imagen no tiene atributo <code className="bg-gray-800/50 p-1 rounded font-mono text-gray-400">alt</code>, lo que afecta a usuarios con discapacidades visuales.</p>

                            {/* ✨ BLOQUE DE CÓDIGO DE COMPARACIÓN HARDCODEADO ✨ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 font-mono text-[11px] leading-tight bg-[#070a13] p-4 rounded-xl border border-gray-800/40">
                                <div>
                                    <p className="text-gray-500 mb-2 font-sans font-medium text-xs">❌ Antes</p>
                                    <pre className="text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-900/40">{`<img src="imagen.jpg">`}</pre>
                                </div>
                                <div>
                                    <p className="text-green-500 mb-2 font-sans font-medium text-xs">✅ Después</p>
                                    <pre className="text-green-400 bg-green-950/20 p-3 rounded-lg border border-green-900/40">{`<img src="imagen.jpg" alt="Descripción clara de la imagen">`}</pre>
                                </div>
                            </div>

                            <p className="text-xs text-white font-semibold mb-2">¿Por qué es importante?</p>
                            <ul className="text-xs text-gray-500 list-disc list-outside pl-4 space-y-1 leading-snug">
                                <li>Mejora la accesibilidad para usuarios con discapacidades visuales</li>
                                <li>Beneficia el SEO</li>
                                <li>Es un estándar HTML5 obligatorio</li>
                            </ul>
                        </div>

                        {/* Bloques sutiles para "No hay" */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-[#0f1423]/60 border border-green-900/30 p-4 rounded-xl flex items-center gap-3">
                                <span className="text-xl">✅</span>
                                <p className="text-xs text-green-300 font-medium">No hay vulnerabilidades detectadas <span className="text-gray-600 block text-[11px] font-normal">¡Excelente! Tu código está seguro en este aspecto.</span></p>
                            </div>
                            <div className="bg-[#0f1423]/60 border border-green-900/30 p-4 rounded-xl flex items-center gap-3">
                                <span className="text-xl">✅</span>
                                <p className="text-xs text-green-300 font-medium">No hay code smells <span className="text-gray-600 block text-[11px] font-normal">La estructura y legibilidad del código son adecuadas.</span></p>
                            </div>
                        </div>

                    </section>

                    {/* 3. Recomendación Final y Prioridad ( Hardcodeado) */}
                    <section>
                        <h4 className="text-purple-300 font-bold mb-3">3. Recomendación de Prioridad</h4>
                        
                        {/* Bloque de Prioridad (Amarillo/Naranja) */}
                        <div className="bg-yellow-950/20 border-l-4 border-yellow-500 rounded-r-2xl p-6 shadow-xl shadow-yellow-950/10">
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-yellow-900/40">
                                <div className="w-9 h-9 bg-yellow-950/50 border border-yellow-900/50 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-950/20"><span className="text-xl drop-shadow-md">⚡</span></div>
                                <h5 className="text-xl font-extrabold text-yellow-300 tracking-tight uppercase">ARREGLAR INMEDIATAMENTE</h5>
                            </div>
                            
                            <p className="text-xs text-white mb-2 leading-snug">El atributo <code className="bg-gray-800/50 p-1 rounded font-mono text-gray-400">alt</code> faltante en la línea 13 del <span className="text-blue-400">index.html</span></p>

                            <p className="text-xs text-white font-semibold mb-2">¿Por qué?</p>
                            <ul className="text-xs text-gray-500 list-disc list-outside pl-4 space-y-1.5 leading-snug">
                                <li>Es un bug de accesibilidad que afecta a usuarios reales</li>
                                <li>Toma menos de 1 minuto corregir</li>
                                <li>Mejora significativamente la experiencia de usuarios y posicionamiento SEO</li>
                            </ul>
                        </div>

                        {/* Bloque Siguiente Paso */}
                        <div className="bg-purple-950/20 border-l-4 border-purple-500 rounded-r-lg p-5 mt-4">
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-xl">🤖</span>
                                <p className="text-sm text-purple-300 font-semibold">Siguiente paso: <span className="text-gray-400 font-normal">Una vez corregido, ejecuta SonarQube nuevamente para confirmar que el proyecto alcanza 0 issues.</span></p>
                            </div>
                        </div>
                    </section>
                  </div>

                </div>
              )}
            </div>

            {/* ➡️ COLUMNA DERECHA (Estrecha): BARRA LATERAL (Resumen + Acciones) */}
            <aside className="sticky top-10 flex flex-col gap-6">
                
                {/* Bloque: Resumen del análisis ( Hardcodeado) */}
                <div className="bg-[#161920]/90 backdrop-blur-md border border-gray-800/70 p-6 rounded-2xl shadow-2xl relative">
                    {/* Efecto de destello "Glint" */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.3),transparent_70%)] rounded-2xl pointer-events-none"></div>

                    <h2 className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-5">Resumen del análisis</h2>
                    
                    <div className="flex flex-col gap-4 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-3 bg-[#0d0f14] p-3 rounded-lg border border-gray-800/60 shadow-inner">📄 <span className="text-gray-500 flex-1">Archivos analizados</span> <span className="text-white font-bold">24</span></span>
                        <span className="flex items-center gap-3 bg-[#0d0f14] p-3 rounded-lg border border-gray-800/60 shadow-inner">📟 <span className="text-gray-500 flex-1">Líneas de código</span> <span className="text-white font-bold">1,428</span></span>
                        <span className="flex items-center gap-3 bg-[#0d0f14] p-3 rounded-lg border border-gray-800/60 shadow-inner">⏳ <span className="text-gray-500 flex-1">Tiempo de análisis</span> <span className="text-white font-bold">8.4s</span></span>
                        <span className="flex items-center gap-3 bg-[#0d0f14] p-3 rounded-lg border border-gray-800/60 shadow-inner">⚙️ <span className="text-gray-500 flex-1">Herramienta</span> <span className="text-white font-bold">SonarQube</span></span>
                    </div>
                </div>

                {/* Bloque: Acciones rápidas (Nuevos Botones) */}
                <div className="bg-[#161920]/90 backdrop-blur-md border border-gray-800/70 p-6 rounded-2xl shadow-2xl relative">
                    <h2 className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-5">Acciones rápidas</h2>
                    <div className="flex flex-col gap-3.5">
                        
                        {/* Botón Principal Reporte completo */}
                        {result.sonar_url && (
                          <a href={result.sonar_url} target="_blank" rel="noopener noreferrer"
                            className="bg-[#1c263c] hover:bg-[#24314d] border border-blue-900/50 shadow-[0_3px_12px_rgba(59,130,246,0.2)] text-white px-6 py-3 rounded-xl text-xs font-bold tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2">
                            <span>Ver reporte completo</span>
                            <span>↗</span>
                          </a>
                        )}

                        {/* Botones Secundarios Hardcodeados (Descargas) */}
                        <button className="bg-[#0d0f14] border border-gray-800 hover:border-gray-600 hover:bg-[#121620] text-gray-300 hover:text-white px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2.5">
                            <span className="text-xl">📄</span> Descargar reporte (PDF)
                        </button>
                        <button className="bg-[#0d0f14] border border-gray-800 hover:border-gray-600 hover:bg-[#121620] text-gray-300 hover:text-white px-6 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2.5">
                            <span className="text-xl">📊</span> Descargar reporte (JSON)
                        </button>
                    </div>
                </div>

                {/* Bloque: ¿Analizar otro? */}
                <div className="bg-[#161920]/90 backdrop-blur-md border border-gray-800/70 p-6 rounded-2xl shadow-2xl relative">
                    <h2 className="text-xs font-bold text-gray-300 tracking-widest uppercase mb-4">¿Quieres analizar otro proyecto?</h2>
                    <p className="text-xs text-gray-500 mb-5 leading-snug">Inicia un nuevo análisis en segundos.</p>
                    <div className="flex justify-center mt-2 pb-1">
                        <button onClick={() => { setResult(null); setPasos({}); }}
                            className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors flex items-center gap-1.5">
                            ← Analizar otro proyecto
                        </button>
                    </div>
                </div>

            </aside>
          </div>
        )}
      </div>

      {/* Modal de Login/Registro - Se mantiene igual */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1423] border border-gray-800/60 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {modalMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </h2>
              <button onClick={() => { setShowModal(false); setAuthError(''); }}
                className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <input type="email" placeholder="Correo electrónico" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="bg-[#070a13] border border-gray-800/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-900/80 transition-colors" />
              <input type="password" placeholder="Contraseña" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="bg-[#070a13] border border-gray-800/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-900/80 transition-colors" />
              {modalMode === 'registro' && (
                <input type="password" placeholder="Confirmar contraseña" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} className="bg-[#070a13] border border-gray-800/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-900/80 transition-colors" />
              )}
              {authError && (
                <p className="text-red-400 text-xs text-center bg-red-900/10 p-2 rounded-lg">{authError}</p>
              )}
              <button onClick={handleAuth} disabled={authLoading} className={`py-3 mt-2 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg ${authLoading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-b from-[#1c263c] to-[#0d121f] hover:from-[#24314d] hover:to-[#12192b] text-white border border-gray-700/50 active:scale-95'}`}>{authLoading ? '...' : modalMode === 'login' ? 'Entrar' : 'Registrarse'}</button>
              <p className="text-center text-xs text-gray-500 mt-2">
                {modalMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button onClick={() => { setModalMode(modalMode === 'login' ? 'registro' : 'login'); setAuthError(''); }} className="text-blue-400 hover:text-blue-300 underline transition-colors">
                  {modalMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}