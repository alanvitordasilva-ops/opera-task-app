import React, { useState, useRef, useEffect } from 'react';
import { TaskAttachment } from '../types/index.ts';
import {
  Image as ImageIcon,
  Film,
  Music,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Maximize2,
  Volume2,
} from 'lucide-react';
import { formatTimeAgoPTBR } from '../utils/helpers.ts';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.tsx';

interface MediaItemCardProps {
  attachment: TaskAttachment;
  index: number;
  totalCount: number;
  onOpenLightbox: (attachment: TaskAttachment) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  canDelete?: boolean;
}

export const MediaItemCard: React.FC<MediaItemCardProps> = ({
  attachment,
  index,
  totalCount,
  onOpenLightbox,
  onDelete,
  onMoveUp,
  onMoveDown,
  canDelete = true,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio player handlers
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(formatAudioTime(current));
    if (dur && !isNaN(dur)) {
      setAudioProgress((current / dur) * 100);
      setDuration(formatAudioTime(dur));
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
    setCurrentTime('0:00');
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = attachment.url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isImage = attachment.mediaCategory === 'image';
  const isVideo = attachment.mediaCategory === 'video';
  const isAudio = attachment.mediaCategory === 'audio';

  return (
    <div className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col gap-2.5">
      {/* Linha Superior: Cabeçalho com Ícone, Nome e Ações */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
            {isImage ? (
              <ImageIcon className="w-4 h-4 text-blue-500" />
            ) : isVideo ? (
              <Film className="w-4 h-4 text-purple-500" />
            ) : (
              <Music className="w-4 h-4 text-emerald-500" />
            )}
          </div>

          <div className="min-w-0">
            <h4
              className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate hover:text-blue-600 cursor-pointer"
              title={attachment.name}
              onClick={() => (isImage || isVideo ? onOpenLightbox(attachment) : undefined)}
            >
              {attachment.name}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {attachment.size}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatTimeAgoPTBR(attachment.uploadedAt)}</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação: Reordenar, Baixar e Excluir */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Reordenação */}
          {onMoveUp && index > 0 && (
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Mover para cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {onMoveDown && index < totalCount - 1 && (
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Mover para baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Baixar */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Baixar arquivo"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Excluir (apenas se autorizado, oculto para visualizadores) */}
          {canDelete && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Excluir anexo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmação Padronizado */}
      <ConfirmDeleteModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => onDelete(attachment.id)}
        title="Excluir anexo?"
        itemName={attachment.name}
        itemType="este anexo"
        message={`Tem certeza que deseja excluir o anexo "${attachment.name}"? Esta ação não pode ser desfeita.`}
      />

      {/* Pré-visualização Específica por Tipo de Mídia */}

      {/* 1. Imagem: Miniatura com Zoom no Hover e clique para Lightbox */}
      {isImage && (
        <div
          onClick={() => onOpenLightbox(attachment)}
          className="relative group/preview w-full h-32 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden cursor-pointer border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center"
        >
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-2xs">
            <Maximize2 className="w-4 h-4" />
            <span>Ver ampliado</span>
          </div>
        </div>
      )}

      {/* 2. Vídeo: Player de vídeo integrado */}
      {isVideo && (
        <div className="w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700">
          <video
            src={attachment.url}
            controls
            preload="metadata"
            className="w-full max-h-48 object-contain"
          />
        </div>
      )}

      {/* 3. Áudio: Player de áudio dedicado com barra de progresso */}
      {isAudio && (
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <audio
            ref={audioRef}
            src={attachment.url}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            onLoadedMetadata={handleAudioTimeUpdate}
            className="hidden"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlayAudio}
              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors"
              title={isPlayingAudio ? 'Pausar áudio' : 'Reproduzir áudio'}
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Barra de Progresso do Áudio */}
            <div className="flex-1 space-y-1">
              <div
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (!audioRef.current || !audioRef.current.duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  audioRef.current.currentTime = pos * audioRef.current.duration;
                }}
              >
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{currentTime}</span>
                <span>{duration}</span>
              </div>
            </div>

            <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
};
