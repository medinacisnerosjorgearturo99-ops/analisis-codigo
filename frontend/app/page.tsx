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

export default function Home() {
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasos, setPasos] = useState<Record<number, PasoEstado>>({});
  const [mensajeActual, setMensajeActual] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const procesarSSE = (endpoint: string, options: RequestInit) => {
    setLoading(true);
    setResult(null);
    setPasos({});
    setMensajeActual('Conectando con el servidor...');

    fetch(`${API}${endpoint}`, options)
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
  const totalPasos = PASOS.length;
  const porcentaje = Math.round((pasosCompletados / totalPasos) * 100);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f1115] text-white p-6 font-sans">
      <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-gray-200 uppercase text-center">
        Analizador de Código
      </h1>
      <p className="text-gray-500 mb-10 text-sm tracking-wide text-center">
        Sube un .zip, pega código, o ingresa la URL de un repositorio de GitHub.
      </p>

      <div className="w-full max-w-3xl bg-[#161920] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-800 p-8 flex flex-col items-center">

        {modeLabel && !loading && (
          <div className="w-full mb-3 text-center text-xs text-blue-400 font-semibold tracking-wider">
            {modeLabel}
          </div>
        )}

        {/* Zona de input — se oculta mientras carga */}
        {!loading && !result && (
          <div
            className={`w-full bg-[#0d0f14] rounded-lg p-2 min-h-[250px] flex flex-col items-center justify-center border-dashed border-2 transition-all relative
              ${isDragging ? 'bg-[#1a1f2b] border-blue-400 scale-[1.02]' : 'border-gray-800 hover:border-gray-600'}`}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          >
            <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            {file ? (
              <div className="flex flex-col items-center text-center p-6">
                <span className="text-5xl mb-4">📦</span>
                <p className="text-green-400 font-bold text-xl mb-2">{file.name}</p>
                <button onClick={() => { setFile(null); setResult(null); }}
                  className="text-gray-500 hover:text-red-400 text-sm underline mt-2">
                  Quitar archivo y volver a modo texto
                </button>
              </div>
            ) : (
              <div className="w-full h-full relative">
                <textarea value={textContent}
                  onChange={(e) => { setTextContent(e.target.value); setResult(null); }}
                  placeholder="Pega tu código aquí, o escribe la URL de un repositorio (https://github.com/usuario/repo)..."
                  className="w-full h-[220px] bg-transparent border-none text-gray-300 placeholder-gray-600 focus:outline-none resize-none p-4 font-mono text-sm"
                />
                <button onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-4 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded transition-colors">
                  📂 Buscar .zip en PC
                </button>
              </div>
            )}
            {isDragging && (
              <div className="absolute inset-0 bg-[#1a1f2b]/90 flex items-center justify-center rounded-lg">
                <span className="text-2xl font-bold text-blue-400 pointer-events-none">¡Suelta tu archivo aquí! ⏬</span>
              </div>
            )}
          </div>
        )}

        {/* ✅ BARRA DE PROGRESO EN TIEMPO REAL */}
        {loading && (
          <div className="w-full py-4">
            {/* Barra de porcentaje */}
            <div className="w-full bg-gray-800 rounded-full h-2 mb-6">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${porcentaje}%` }}
              />
            </div>

            {/* Mensaje actual */}
            <p className="text-center text-blue-400 text-sm font-semibold mb-6 tracking-wide">
              {mensajeActual}
            </p>

            {/* Lista de pasos */}
            <div className="flex flex-col gap-3">
              {PASOS.map(paso => {
                const estado = pasos[paso.id];
                const completado = estado?.completado;
                const activo = estado?.activo;
                const error = estado?.error;

                return (
                  <div key={paso.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all
                    ${completado && !error ? 'bg-green-900/20 border border-green-900/40' :
                      error ? 'bg-red-900/20 border border-red-900/40' :
                      activo ? 'bg-blue-900/20 border border-blue-900/40' :
                      'bg-gray-900/20 border border-gray-800'}`}>
                    <span className="text-xl">
                      {completado && !error ? '✅' : error ? '❌' : activo ? '⏳' : '⬜'}
                    </span>
                    <span className={`text-sm font-medium
                      ${completado && !error ? 'text-green-400' :
                        error ? 'text-red-400' :
                        activo ? 'text-blue-400' :
                        'text-gray-600'}`}>
                      {estado?.mensaje || paso.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resultados */}
        {result && (
          <div className="w-full">
            <div className={`p-4 rounded-lg text-center font-bold text-sm mb-6
              ${result.status === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                'bg-red-900/30 text-red-400 border border-red-800'}`}>
              <p>{result.mensaje}</p>
            </div>

            {result.stats && Object.keys(result.stats).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1a1f2b] border border-red-900/50 p-6 rounded-xl flex flex-col items-center shadow-lg hover:border-red-500 transition-colors">
                  <span className="text-4xl mb-2">🐛</span>
                  <h3 className="text-red-400 font-bold tracking-widest text-xs uppercase">Bugs</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.bugs ?? '0'}</p>
                </div>
                <div className="bg-[#1a1f2b] border border-orange-900/50 p-6 rounded-xl flex flex-col items-center shadow-lg hover:border-orange-500 transition-colors">
                  <span className="text-4xl mb-2">🔓</span>
                  <h3 className="text-orange-400 font-bold tracking-widest text-xs uppercase">Vulnerabilidades</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.vulnerabilities ?? '0'}</p>
                </div>
                <div className="bg-[#1a1f2b] border border-yellow-900/50 p-6 rounded-xl flex flex-col items-center shadow-lg hover:border-yellow-500 transition-colors">
                  <span className="text-4xl mb-2">🤢</span>
                  <h3 className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Code Smells</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.code_smells ?? '0'}</p>
                  <p className="text-gray-500 text-[10px] mt-1">Mejoras de mantenimiento</p>
                </div>
              </div>
            )}

            {result.ai_recomendaciones && (
              <div className="w-full bg-[#0d1117] border border-purple-900/50 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤖</span>
                  <h3 className="text-purple-400 font-bold tracking-widest text-xs uppercase">
                    Recomendaciones de IA
                  </h3>
                </div>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {result.ai_recomendaciones}
                </div>
              </div>
            )}

            {result.sonar_url && (
              <div className="flex justify-center mb-6">
                <a href={result.sonar_url} target="_blank" rel="noopener noreferrer"
                  className="bg-[#0d0f14] border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-white px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2">
                  <span>Ver reporte completo en SonarQube</span>
                  <span>→</span>
                </a>
              </div>
            )}

            {/* Botón para analizar de nuevo */}
            <div className="flex justify-center">
              <button
                onClick={() => { setResult(null); setPasos({}); }}
                className="text-gray-500 hover:text-gray-300 text-sm underline"
              >
                ← Analizar otro proyecto
              </button>
            </div>
          </div>
        )}

        {/* Botón principal */}
        {!loading && !result && (
          <button onClick={handleAnalyze}
            className="mt-8 px-14 py-4 font-bold rounded shadow-[0_5px_15px_rgba(0,0,0,0.4)] uppercase tracking-[0.2em] text-sm transition-all w-full md:w-auto bg-gradient-to-b from-[#2d3a5a] to-[#1e293b] hover:from-[#3b4b7a] hover:to-[#2d3a5a] text-white border border-blue-900/50 active:scale-95">
            ANALIZAR CÓDIGO
          </button>
        )}
      </div>
    </main>
  );
}