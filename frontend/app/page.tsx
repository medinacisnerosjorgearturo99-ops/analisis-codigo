'use client';
import { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:8000';

// Detecta el lenguaje del código pegado para pasarlo al backend
function guessLanguage(code: string): string {
  if (code.includes('import React') || code.includes('useState') || code.includes('tsx')) return 'tsx';
  if (code.includes('def ') || code.includes('import os') || code.includes('print(')) return 'py';
  if (code.includes('public class') || code.includes('System.out')) return 'java';
  if (code.includes('func ') && code.includes('package ')) return 'go';
  if (code.includes('<?php')) return 'php';
  return 'js';
}

function isRepoUrl(text: string): boolean {
  const t = text.trim();
  return t.startsWith('https://github.com') ||
    t.startsWith('https://gitlab.com') ||
    t.startsWith('https://bitbucket.org') ||
    t.startsWith('git@');
}

export default function Home() {
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
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
      setFile(e.dataTransfer.files[0]);
      setTextContent('');
      setResult(null);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setTextContent('');
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file && !textContent.trim()) {
      alert('⚠️ Por favor, pega código, una URL de repositorio, o sube un archivo .zip.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response: Response;

      if (file) {
        // CASO 1: archivo .zip
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch(`${API}/upload`, { method: 'POST', body: formData });

      } else if (isRepoUrl(textContent)) {
        // CASO 2: URL de repositorio
        response = await fetch(`${API}/analyze-repo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: textContent.trim() }),
        });

      } else {
        // CASO 3: código pegado en texto
        const lang = guessLanguage(textContent);
        response = await fetch(`${API}/analyze-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: textContent, language: lang }),
        });
      }

      const data = await response.json();
      setResult(data);

    } catch (error) {
      console.error('Error:', error);
      setResult({ status: 'error', mensaje: 'Error al conectar con el servidor. ¿Está Docker corriendo?' });
    } finally {
      setLoading(false);
    }
  };

  // Indicador del modo activo
  const modeLabel = file
    ? `📦 ${file.name}`
    : textContent.trim()
      ? isRepoUrl(textContent) ? '🔗 Repositorio detectado' : `📝 Código detectado (${guessLanguage(textContent)})`
      : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f1115] text-white p-6 font-sans">
      <h1 className="text-4xl font-extrabold tracking-widest mb-2 text-gray-200 uppercase text-center">
        Analizador de Código
      </h1>
      <p className="text-gray-500 mb-10 text-sm tracking-wide text-center">
        Sube un .zip, pega código, o ingresa la URL de un repositorio de GitHub.
      </p>

      <div className="w-full max-w-3xl bg-[#161920] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-800 p-8 flex flex-col items-center">

        {/* Indicador de modo activo */}
        {modeLabel && (
          <div className="w-full mb-3 text-center text-xs text-blue-400 font-semibold tracking-wider">
            {modeLabel}
          </div>
        )}

        {/* Zona Interactiva */}
        <div
          className={`w-full bg-[#0d0f14] rounded-lg p-2 min-h-[250px] flex flex-col items-center justify-center border-dashed border-2 transition-all relative
            ${isDragging ? 'bg-[#1a1f2b] border-blue-400 scale-[1.02]' : 'border-gray-800 hover:border-gray-600'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" accept=".zip" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          {file ? (
            <div className="flex flex-col items-center text-center p-6">
              <span className="text-5xl mb-4">📦</span>
              <p className="text-green-400 font-bold text-xl mb-2">{file.name}</p>
              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="text-gray-500 hover:text-red-400 text-sm underline mt-2"
              >
                Quitar archivo y volver a modo texto
              </button>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <textarea
                value={textContent}
                onChange={(e) => { setTextContent(e.target.value); setResult(null); }}
                placeholder="Pega tu código aquí, o escribe la URL de un repositorio (https://github.com/usuario/repo)..."
                className="w-full h-[220px] bg-transparent border-none text-gray-300 placeholder-gray-600 focus:outline-none resize-none p-4 font-mono text-sm"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-4 right-4 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded transition-colors"
              >
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

        {/* Resultados */}
        {result && (
          <div className="mt-8 w-full">
            <div className={`p-4 rounded-lg text-center font-bold text-sm mb-6
              ${result.status === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                result.status === 'info'    ? 'bg-blue-900/30 text-blue-400 border border-blue-800' :
                'bg-red-900/30 text-red-400 border border-red-800'}`}>
              <p>{result.mensaje}</p>
            </div>

            {/* Dashboard de métricas */}
            {result.stats && Object.keys(result.stats).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1a1f2b] border border-red-900/50 p-6 rounded-xl flex flex-col items-center justify-center shadow-lg hover:border-red-500 transition-colors">
                  <span className="text-4xl mb-2">🐛</span>
                  <h3 className="text-red-400 font-bold tracking-widest text-xs uppercase">Bugs</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.bugs ?? '0'}</p>
                </div>
                <div className="bg-[#1a1f2b] border border-orange-900/50 p-6 rounded-xl flex flex-col items-center justify-center shadow-lg hover:border-orange-500 transition-colors">
                  <span className="text-4xl mb-2">🔓</span>
                  <h3 className="text-orange-400 font-bold tracking-widest text-xs uppercase">Vulnerabilidades</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.vulnerabilities ?? '0'}</p>
                </div>
                <div className="bg-[#1a1f2b] border border-yellow-900/50 p-6 rounded-xl flex flex-col items-center justify-center shadow-lg hover:border-yellow-500 transition-colors">
                  <span className="text-4xl mb-2">🤢</span>
                  <h3 className="text-yellow-400 font-bold tracking-widest text-xs uppercase">Code Smells</h3>
                  <p className="text-4xl font-extrabold text-white mt-2">{result.stats.code_smells ?? '0'}</p>
                  <p className="text-gray-500 text-[10px] mt-1">Mejoras de mantenimiento</p>
                </div>
              </div>
            )}

            {/* Métricas vacías — SonarQube procesó pero no encontró issues */}
            {result.stats && Object.keys(result.stats).length === 0 && (
              <p className="text-center text-gray-500 text-xs mb-6">
                ✅ Sin métricas aún — SonarQube puede tardar unos segundos más en procesarlas.
              </p>
            )}

            {result.sonar_url && (
              <div className="flex justify-center">
                <a
                  href={result.sonar_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0d0f14] border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-white px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2"
                >
                  <span>Ver reporte completo en SonarQube</span>
                  <span>→</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`mt-8 px-14 py-4 font-bold rounded shadow-[0_5px_15px_rgba(0,0,0,0.4)] uppercase tracking-[0.2em] text-sm transition-all w-full md:w-auto
            ${loading
              ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
              : 'bg-gradient-to-b from-[#2d3a5a] to-[#1e293b] hover:from-[#3b4b7a] hover:to-[#2d3a5a] text-white border border-blue-900/50 active:scale-95'
            }`}
        >
          {loading ? '⏳ ANALIZANDO...' : 'ANALIZAR CÓDIGO'}
        </button>
      </div>
    </main>
  );
}