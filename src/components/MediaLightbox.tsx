import React, { useEffect, useState } from 'react';
import { TaskAttachment } from '../types/index.ts';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Film, Image as ImageIcon } from 'lucide-react';

interface MediaLightboxProps {
  attachment: TaskAttachment | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ attachment, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [attachment]);

  if (!attachment) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = attachment.url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isVideo = attachment.mediaCategory === 'video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho da Lightbox */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60 text-white">
          <div className="flex items-center gap-2 min-w-0">
            {isVideo ? (
              <Film className="w-4 h-4 text-purple-400 shrink-0" />
            ) : (
              <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold truncate max-w-md">
                {attachment.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {attachment.size} · {attachment.type}
              </p>
            </div>
          </div>

          {/* Controles de Visualização */}
          <div className="flex items-center gap-1.5">
            {!isVideo && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="px-2 py-1 text-xs text-slate-300 hover:text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  title="Redefinir Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Girar 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizador Principal */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/40 min-h-[300px]">
          {isVideo ? (
            <video
              src={attachment.url}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-xl shadow-lg"
            />
          ) : (
            <div className="overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={attachment.url}
                alt={attachment.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
