'use client';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!file) return alert("Por favor selecciona un archivo primero.");
    // Aquí después conectaremos con el backend real
    alert(`Simulando subida del archivo: ${file.name}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-10 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Análisis de Rendimiento de Código
        </h1>
        <p className="text-gray-600 mb-8">
          Sube tu repositorio en .zip para evaluar seguridad, escalabilidad y mantenimiento con IA.
        </p>

        {/* Zona de Drag & Drop (Intuitiva y clara) */}
        <div className="border-4 border-dashed border-blue-300 bg-blue-50 rounded-lg p-12 mb-6 hover:bg-blue-100 transition-colors">
          <input 
            type="file" 
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-3 file:px-6
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700 cursor-pointer"
          />
        </div>

        <button 
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all"
        >
          Iniciar Análisis
        </button>
      </div>
    </main>
  );
}